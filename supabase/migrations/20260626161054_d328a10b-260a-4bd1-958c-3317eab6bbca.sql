
-- Extend role enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

-- schools
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- school_id columns
ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.user_roles       ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.classes          ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.subjects         ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.students         ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.teachers         ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.exams            ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.fees             ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.announcements    ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.transport_routes ADD COLUMN IF NOT EXISTS school_id uuid;

-- helper: add FK only if not present
CREATE OR REPLACE FUNCTION pg_temp.add_fk(_table text, _name text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname=_table AND c.conname=_name
  ) THEN
    EXECUTE _sql;
  END IF;
END $$;

-- school FKs
SELECT pg_temp.add_fk('profiles','profiles_school_id_fkey',
  'ALTER TABLE public.profiles ADD CONSTRAINT profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL');
SELECT pg_temp.add_fk('user_roles','user_roles_school_id_fkey',
  'ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('classes','classes_school_id_fkey',
  'ALTER TABLE public.classes ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('subjects','subjects_school_id_fkey',
  'ALTER TABLE public.subjects ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('students','students_school_id_fkey',
  'ALTER TABLE public.students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('teachers','teachers_school_id_fkey',
  'ALTER TABLE public.teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('exams','exams_school_id_fkey',
  'ALTER TABLE public.exams ADD CONSTRAINT exams_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('fees','fees_school_id_fkey',
  'ALTER TABLE public.fees ADD CONSTRAINT fees_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('announcements','announcements_school_id_fkey',
  'ALTER TABLE public.announcements ADD CONSTRAINT announcements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('transport_routes','transport_routes_school_id_fkey',
  'ALTER TABLE public.transport_routes ADD CONSTRAINT transport_routes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE');

-- Missing FKs to auth.users
SELECT pg_temp.add_fk('students','students_user_id_fkey',
  'ALTER TABLE public.students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL');
SELECT pg_temp.add_fk('teachers','teachers_user_id_fkey',
  'ALTER TABLE public.teachers ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL');
SELECT pg_temp.add_fk('attendance','attendance_marked_by_fkey',
  'ALTER TABLE public.attendance ADD CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL');
SELECT pg_temp.add_fk('messages','messages_sender_id_fkey',
  'ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('messages','messages_recipient_id_fkey',
  'ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk('announcements','announcements_created_by_fkey',
  'ALTER TABLE public.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL');

-- Helper functions (text compare keeps us safe re: brand-new enum value within same tx)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role::text='super_admin')
$$;
CREATE OR REPLACE FUNCTION public.get_user_school(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id=_user_id
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_school(uuid)          FROM PUBLIC, anon;

-- schools policies (drop-if-exists for idempotency)
DROP POLICY IF EXISTS "super admin manages schools" ON public.schools;
CREATE POLICY "super admin manages schools" ON public.schools FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "members read own school" ON public.schools;
CREATE POLICY "members read own school" ON public.schools FOR SELECT TO authenticated
  USING (id = public.get_user_school(auth.uid()));

-- parents
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent reads self" ON public.parents;
CREATE POLICY "parent reads self" ON public.parents FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "school admin manages parents" ON public.parents;
CREATE POLICY "school admin manages parents" ON public.parents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND school_id = public.get_user_school(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND school_id = public.get_user_school(auth.uid()));
DROP POLICY IF EXISTS "super admin manages parents" ON public.parents;
CREATE POLICY "super admin manages parents" ON public.parents FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- parent_students
CREATE TABLE IF NOT EXISTS public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent reads own links" ON public.parent_students;
CREATE POLICY "parent reads own links" ON public.parent_students FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parents p WHERE p.id = parent_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "school admin manages links" ON public.parent_students;
CREATE POLICY "school admin manages links" ON public.parent_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "super admin manages links" ON public.parent_students;
CREATE POLICY "super admin manages links" ON public.parent_students FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- parent_has_student + parent-read policies on child data
CREATE OR REPLACE FUNCTION public.parent_has_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE p.user_id = _user_id AND ps.student_id = _student_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.parent_has_student(uuid,uuid) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "parent reads child student"    ON public.students;
CREATE POLICY "parent reads child student"    ON public.students     FOR SELECT TO authenticated USING (public.parent_has_student(auth.uid(), id));
DROP POLICY IF EXISTS "parent reads child attendance" ON public.attendance;
CREATE POLICY "parent reads child attendance" ON public.attendance   FOR SELECT TO authenticated USING (public.parent_has_student(auth.uid(), student_id));
DROP POLICY IF EXISTS "parent reads child results"    ON public.exam_results;
CREATE POLICY "parent reads child results"    ON public.exam_results FOR SELECT TO authenticated USING (public.parent_has_student(auth.uid(), student_id));
DROP POLICY IF EXISTS "parent reads child fees"       ON public.fee_payments;
CREATE POLICY "parent reads child fees"       ON public.fee_payments FOR SELECT TO authenticated USING (public.parent_has_student(auth.uid(), student_id));

-- super_admin cross-tenant access
DROP POLICY IF EXISTS "super admin profiles"   ON public.profiles;
CREATE POLICY "super admin profiles"   ON public.profiles   FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "super admin user_roles" ON public.user_roles;
CREATE POLICY "super admin user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_students_school     ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school     ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school      ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school     ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school        ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_school         ON public.fees(school_id);
CREATE INDEX IF NOT EXISTS idx_announce_school     ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_routes_school       ON public.transport_routes(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school     ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school   ON public.user_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student  ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_exam_results_stu    ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_stu    ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender     ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient  ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_parents_user        ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_school      ON public.parents(school_id);
CREATE INDEX IF NOT EXISTS idx_ps_parent           ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_ps_student          ON public.parent_students(student_id);

-- Signup trigger: reliable profile, no default role unless metadata sets it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school uuid;
  _role_text text;
BEGIN
  _school := NULLIF(NEW.raw_user_meta_data->>'school_id','')::uuid;
  INSERT INTO public.profiles (id, full_name, school_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), _school)
  ON CONFLICT (id) DO NOTHING;
  _role_text := NULLIF(NEW.raw_user_meta_data->>'role','');
  IF _role_text IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (NEW.id, _role_text::public.app_role, _school)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper + triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS schools_updated_at ON public.schools;
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS parents_updated_at ON public.parents;
CREATE TRIGGER parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
