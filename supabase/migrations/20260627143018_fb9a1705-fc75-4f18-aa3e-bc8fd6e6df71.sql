
-- ============ Sub-wave 2A: Academics schema ============

-- Extend exams
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS exam_results_updated_at ON public.exam_results;
CREATE TRIGGER exam_results_updated_at BEFORE UPDATE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HOMEWORK ============
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hw_school_read" ON public.homework FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "hw_teacher_write" ON public.homework FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (school_id = public.auth_school_id()
        AND (public.has_role(auth.uid(),'school_admin') OR created_by = auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (school_id = public.auth_school_id()
        AND (public.has_role(auth.uid(),'school_admin')
             OR public.has_role(auth.uid(),'teacher')))
  );

CREATE TRIGGER homework_updated_at BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_hw_section ON public.homework(section_id);
CREATE INDEX IF NOT EXISTS idx_hw_school ON public.homework(school_id);
CREATE INDEX IF NOT EXISTS idx_hw_due ON public.homework(due_date);

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  status text NOT NULL DEFAULT 'submitted',
  grade text,
  marks numeric,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(homework_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hws_school_read" ON public.homework_submissions FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (school_id = public.auth_school_id() AND (
    public.has_role(auth.uid(),'school_admin')
    OR public.has_role(auth.uid(),'teacher')
    OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=student_id AND s.user_id=auth.uid())
    OR public.parent_has_student(auth.uid(), student_id)
  ))
);
CREATE POLICY "hws_student_write" ON public.homework_submissions FOR INSERT TO authenticated
  WITH CHECK (school_id = public.auth_school_id() AND EXISTS(SELECT 1 FROM public.students s WHERE s.id=student_id AND s.user_id=auth.uid()));
CREATE POLICY "hws_student_update" ON public.homework_submissions FOR UPDATE TO authenticated
  USING (
    (EXISTS(SELECT 1 FROM public.students s WHERE s.id=student_id AND s.user_id=auth.uid()) AND status <> 'graded')
    OR public.has_role(auth.uid(),'teacher')
    OR public.has_role(auth.uid(),'school_admin')
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "hws_admin_delete" ON public.homework_submissions FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'school_admin'));

CREATE TRIGGER hws_updated_at BEFORE UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LIBRARY ============
CREATE TABLE IF NOT EXISTS public.book_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_categories TO authenticated;
GRANT ALL ON public.book_categories TO service_role;
ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_read" ON public.book_categories FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "bc_admin_write" ON public.book_categories FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));

CREATE TABLE IF NOT EXISTS public.book_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_authors TO authenticated;
GRANT ALL ON public.book_authors TO service_role;
ALTER TABLE public.book_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_read" ON public.book_authors FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "ba_admin_write" ON public.book_authors FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));

CREATE TABLE IF NOT EXISTS public.book_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_publishers TO authenticated;
GRANT ALL ON public.book_publishers TO service_role;
ALTER TABLE public.book_publishers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_read" ON public.book_publishers FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "bp_admin_write" ON public.book_publishers FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));

CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  isbn text,
  category_id uuid REFERENCES public.book_categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.book_authors(id) ON DELETE SET NULL,
  publisher_id uuid REFERENCES public.book_publishers(id) ON DELETE SET NULL,
  total_copies int NOT NULL DEFAULT 1,
  available_copies int NOT NULL DEFAULT 1,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_read" ON public.books FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "books_admin_write" ON public.books FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));
CREATE TRIGGER books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.book_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  borrower_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  borrower_role text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  returned_at timestamptz,
  fine_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_loans TO authenticated;
GRANT ALL ON public.book_loans TO service_role;
ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bl_read" ON public.book_loans FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (school_id=public.auth_school_id() AND (public.has_role(auth.uid(),'school_admin') OR borrower_user_id=auth.uid()))
);
CREATE POLICY "bl_admin_write" ON public.book_loans FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));
CREATE TRIGGER book_loans_updated_at BEFORE UPDATE ON public.book_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EXAM GRADES (config) ============
CREATE TABLE IF NOT EXISTS public.exam_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade text NOT NULL,
  min_pct numeric NOT NULL,
  max_pct numeric NOT NULL,
  gpa numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_grades TO authenticated;
GRANT ALL ON public.exam_grades TO service_role;
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eg_read" ON public.exam_grades FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id=public.auth_school_id());
CREATE POLICY "eg_admin_write" ON public.exam_grades FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'school_admin') AND school_id=public.auth_school_id()));

-- Helper: compute grade & gpa for a pct
CREATE OR REPLACE FUNCTION public.compute_grade(_school_id uuid, _pct numeric)
RETURNS TABLE(grade text, gpa numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT g.grade, g.gpa FROM public.exam_grades g
  WHERE g.school_id=_school_id AND _pct >= g.min_pct AND _pct <= g.max_pct
  ORDER BY g.min_pct DESC LIMIT 1
$$;
