
-- Phase 2: ERP foundation schema

-- 1) Schools: feature flags + current session pointer
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{"student_login": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_session_id uuid;

-- 2) Academic sessions
CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_sessions TO authenticated;
GRANT ALL ON public.academic_sessions TO service_role;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Same-school read sessions" ON public.academic_sessions
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id()
  );
CREATE POLICY "School admin manage sessions" ON public.academic_sessions
  FOR ALL TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'school_admin') AND school_id = public.auth_school_id())
  ) WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'school_admin') AND school_id = public.auth_school_id())
  );
CREATE TRIGGER trg_academic_sessions_updated_at
  BEFORE UPDATE ON public.academic_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.schools
  ADD CONSTRAINT schools_current_session_fkey
  FOREIGN KEY (current_session_id) REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

-- 3) Teacher assignments: session_id
ALTER TABLE public.teacher_assignments
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- backfill class_id / school_id from existing assignments via sections
UPDATE public.teacher_assignments ta
SET class_id = s.class_id, school_id = s.school_id
FROM public.sections s
WHERE ta.section_id = s.id AND (ta.class_id IS NULL OR ta.school_id IS NULL);

-- 4) Uniqueness rules
CREATE UNIQUE INDEX IF NOT EXISTS classes_unique_active_name
  ON public.classes (school_id, name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS sections_unique_active_name
  ON public.sections (class_id, name) WHERE status = 'active';

-- 5) Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Same-school read audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'school_admin') AND school_id = public.auth_school_id())
  );

-- 6) Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Mark own read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7) Feature flag helper
CREATE OR REPLACE FUNCTION public.school_feature(_school_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((features ->> _key)::boolean, false) FROM public.schools WHERE id = _school_id
$$;

-- 8) Safe-delete RPCs
CREATE OR REPLACE FUNCTION public.delete_class_if_unreferenced(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin')
           AND (SELECT school_id FROM public.classes WHERE id=_id) = public.auth_school_id()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*) INTO n FROM public.sections WHERE class_id=_id AND status='active';
  IF n > 0 THEN RAISE EXCEPTION 'class has % active sections', n; END IF;
  SELECT count(*) INTO n FROM public.students WHERE class_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'class has % students', n; END IF;
  SELECT count(*) INTO n FROM public.timetable WHERE class_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'class is referenced by timetable'; END IF;
  SELECT count(*) INTO n FROM public.exams WHERE class_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'class is referenced by exams'; END IF;
  SELECT count(*) INTO n FROM public.fees WHERE class_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'class is referenced by fees'; END IF;

  DELETE FROM public.classes WHERE id=_id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_section_if_unreferenced(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin')
           AND (SELECT school_id FROM public.sections WHERE id=_id) = public.auth_school_id()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*) INTO n FROM public.students WHERE section_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'section has % students', n; END IF;
  SELECT count(*) INTO n FROM public.teacher_assignments WHERE section_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'section is referenced by teacher assignments'; END IF;
  SELECT count(*) INTO n FROM public.timetable WHERE section_id=_id;
  IF n > 0 THEN RAISE EXCEPTION 'section is referenced by timetable'; END IF;

  DELETE FROM public.sections WHERE id=_id;
END $$;
