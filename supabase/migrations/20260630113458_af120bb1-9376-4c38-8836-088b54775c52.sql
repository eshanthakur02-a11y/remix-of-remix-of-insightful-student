
-- 1) attendance: add helpful columns (school_id, section_id, notes)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance(school_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_section_date ON public.attendance(section_id, date DESC);

-- Backfill school_id from students
UPDATE public.attendance a SET school_id = s.school_id
FROM public.students s WHERE a.student_id = s.id AND a.school_id IS NULL;

-- 2) Bulk attendance RPC
CREATE OR REPLACE FUNCTION public.mark_attendance_bulk(
  _date date,
  _section_id uuid,
  _entries jsonb  -- [{student_id, status, notes?}]
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row jsonb;
  _school uuid;
  _n int := 0;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
       OR public.has_role(auth.uid(),'school_admin')
       OR public.has_role(auth.uid(),'teacher')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT school_id INTO _school FROM public.sections WHERE id = _section_id;
  IF _school IS NULL THEN RAISE EXCEPTION 'section not found'; END IF;

  FOR _row IN SELECT * FROM jsonb_array_elements(_entries) LOOP
    INSERT INTO public.attendance(student_id, date, status, marked_by, school_id, section_id, notes)
    VALUES (
      (_row->>'student_id')::uuid, _date,
      COALESCE(_row->>'status','present'),
      auth.uid(), _school, _section_id, NULLIF(_row->>'notes','')
    )
    ON CONFLICT (student_id, date) DO UPDATE
      SET status = EXCLUDED.status,
          marked_by = EXCLUDED.marked_by,
          section_id = EXCLUDED.section_id,
          school_id = EXCLUDED.school_id,
          notes = EXCLUDED.notes;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

-- 3) Library: issue and return RPCs
CREATE OR REPLACE FUNCTION public.issue_book(
  _book_id uuid,
  _borrower_user_id uuid,
  _borrower_role text,
  _due_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _school uuid; _avail int; _id uuid;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT school_id, available_copies INTO _school, _avail FROM public.books WHERE id = _book_id FOR UPDATE;
  IF _school IS NULL THEN RAISE EXCEPTION 'book not found'; END IF;
  IF _avail <= 0 THEN RAISE EXCEPTION 'no copies available'; END IF;

  INSERT INTO public.book_loans(school_id, book_id, borrower_user_id, borrower_role, due_at, status)
  VALUES (_school, _book_id, _borrower_user_id, _borrower_role, _due_at, 'issued')
  RETURNING id INTO _id;

  UPDATE public.books SET available_copies = available_copies - 1 WHERE id = _book_id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.return_book(
  _loan_id uuid,
  _fine_per_day numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _book_id uuid; _due timestamptz; _overdue int; _fine numeric := 0;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT book_id, due_at INTO _book_id, _due FROM public.book_loans WHERE id = _loan_id AND status = 'issued' FOR UPDATE;
  IF _book_id IS NULL THEN RAISE EXCEPTION 'loan not found or already returned'; END IF;
  _overdue := GREATEST(0, EXTRACT(day FROM (now() - _due))::int);
  IF _fine_per_day > 0 AND _overdue > 0 THEN _fine := _overdue * _fine_per_day; END IF;

  UPDATE public.book_loans
    SET returned_at = now(), status = 'returned', fine_amount = _fine
    WHERE id = _loan_id;
  UPDATE public.books SET available_copies = available_copies + 1 WHERE id = _book_id;
END $$;

-- 4) Generate invoices from a fee structure for all students in a class (or whole school if class_id null)
CREATE OR REPLACE FUNCTION public.generate_invoices_for_structure(
  _structure_id uuid,
  _due_date date DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _school uuid; _class uuid; _amount numeric; _name text; _session uuid; _n int := 0; _stu record;
BEGIN
  SELECT school_id, class_id, amount, name, session_id
    INTO _school, _class, _amount, _name, _session
    FROM public.fee_structures WHERE id = _structure_id;
  IF _school IS NULL THEN RAISE EXCEPTION 'structure not found'; END IF;
  IF NOT (public.is_super_admin(auth.uid())
       OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
           AND _school = public.auth_school_id())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _stu IN
    SELECT id FROM public.students
    WHERE school_id = _school AND (_class IS NULL OR class_id = _class)
  LOOP
    INSERT INTO public.fee_invoices(school_id, student_id, structure_id, session_id, title, amount, due_date, status)
    VALUES (_school, _stu.id, _structure_id, _session, _name, _amount, _due_date, 'pending');
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

-- 5) Publish / unpublish exam results
CREATE OR REPLACE FUNCTION public.set_exam_published(_exam_id uuid, _published boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _school uuid;
BEGIN
  SELECT school_id INTO _school FROM public.exams WHERE id = _exam_id;
  IF _school IS NULL THEN RAISE EXCEPTION 'exam not found'; END IF;
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin') AND _school = public.auth_school_id())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.exams SET is_published = _published WHERE id = _exam_id;
  IF _published THEN
    UPDATE public.exam_results SET published_at = now() WHERE exam_id = _exam_id AND published_at IS NULL;
  ELSE
    UPDATE public.exam_results SET published_at = NULL WHERE exam_id = _exam_id;
  END IF;
END $$;
