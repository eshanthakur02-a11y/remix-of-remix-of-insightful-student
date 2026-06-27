
-- 1) Auth user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Lock down SECURITY DEFINER helpers (revoke anon EXECUTE)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.auth_role()',
    'public.auth_school_id()',
    'public.get_user_school(uuid)',
    'public.has_role(uuid, public.app_role)',
    'public.is_super_admin(uuid)',
    'public.parent_has_student(uuid, uuid)',
    'public.school_feature(uuid, text)',
    'public.delete_class_if_unreferenced(uuid)',
    'public.delete_section_if_unreferenced(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- 3) Audit log helper
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _entity text,
  _entity_id uuid DEFAULT NULL,
  _school_id uuid DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.audit_logs (school_id, actor_user_id, action, entity, entity_id, meta)
  VALUES (COALESCE(_school_id, public.auth_school_id()), auth.uid(), _action, _entity, _entity_id, COALESCE(_meta, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) TO authenticated, service_role;

-- 4) Notification helper
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _kind text,
  _title text,
  _body text DEFAULT NULL,
  _school_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, school_id, kind, title, body)
  VALUES (_user_id, _school_id, _kind, _title, _body)
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid) TO authenticated, service_role;

-- Allow users to mark their own notifications read via RLS (already enabled in earlier phases). 
-- Add a safe RPC for marking-all-read in one call.
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.notifications SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- 5) Subject status (for archive / restore)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_status_chk;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_status_chk CHECK (status IN ('active','archived'));
CREATE UNIQUE INDEX IF NOT EXISTS subjects_school_name_unique
  ON public.subjects (school_id, lower(name)) WHERE status = 'active';

-- 6) Academic session: only one active per school
CREATE OR REPLACE FUNCTION public.set_current_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _school uuid;
BEGIN
  SELECT school_id INTO _school FROM public.academic_sessions WHERE id = _session_id;
  IF _school IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF NOT (public.is_super_admin(auth.uid())
       OR (public.has_role(auth.uid(),'school_admin') AND _school = public.auth_school_id()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.academic_sessions SET is_current = false, status = CASE WHEN status='active' THEN 'inactive' ELSE status END
    WHERE school_id = _school AND id <> _session_id;
  UPDATE public.academic_sessions SET is_current = true, status = 'active' WHERE id = _session_id;
  UPDATE public.schools SET current_session_id = _session_id WHERE id = _school;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_current_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_current_session(uuid) TO authenticated, service_role;

-- 7) Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created ON public.audit_logs (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender ON public.messages (recipient_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_student ON public.exam_results (exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee ON public.fee_payments (fee_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class_section ON public.students (school_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON public.sections (class_id, status);
CREATE INDEX IF NOT EXISTS idx_subjects_school_status ON public.subjects (school_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON public.academic_sessions (school_id, is_current);

-- 8) Realtime for notifications
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
