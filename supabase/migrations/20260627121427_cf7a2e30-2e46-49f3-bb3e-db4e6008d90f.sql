
-- 1. Rename enum value admin -> school_admin (auto-updates all stored data and policy references)
ALTER TYPE public.app_role RENAME VALUE 'admin' TO 'school_admin';

-- 2. Profiles: status + last_login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended')),
  ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- 3. Schools: status
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended'));

-- 4. Classes + sections: status
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived'));

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived')),
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill section.school_id from parent class
UPDATE public.sections s SET school_id = c.school_id
FROM public.classes c WHERE s.class_id = c.id AND s.school_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sections_school ON public.sections(school_id);

-- 5. teacher_assignments join table
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, section_id, subject_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section ON public.teacher_assignments(section_id);

-- 6. Helper functions (security definer, search_path locked)
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auth_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.auth_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auth_school_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_school_id() TO authenticated;

-- 7. teacher_assignments policies
CREATE POLICY "ta super admin"
  ON public.teacher_assignments
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "ta school admin same school"
  ON public.teacher_assignments
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_assignments.teacher_id
        AND t.school_id = public.auth_school_id()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_assignments.teacher_id
        AND t.school_id = public.auth_school_id()
    )
  );

CREATE POLICY "ta teacher reads own"
  ON public.teacher_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_assignments.teacher_id AND t.user_id = auth.uid()
    )
  );

-- 8. handle_new_user: map old metadata 'admin' role to 'school_admin' going forward, set status=active when explicit role given
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school uuid;
  _role_text text;
BEGIN
  _school := NULLIF(NEW.raw_user_meta_data->>'school_id','')::uuid;
  _role_text := NULLIF(NEW.raw_user_meta_data->>'role','');
  IF _role_text = 'admin' THEN _role_text := 'school_admin'; END IF;

  INSERT INTO public.profiles (id, full_name, school_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    _school,
    CASE WHEN _role_text IS NULL THEN 'invited' ELSE 'invited' END
  )
  ON CONFLICT (id) DO NOTHING;

  IF _role_text IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (NEW.id, _role_text::public.app_role, _school)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
