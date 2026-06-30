
-- Transport tables
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  reg_no text NOT NULL,
  model text,
  capacity int DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, reg_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles read same school" ON public.vehicles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "vehicles admin write" ON public.vehicles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()));
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  license_no text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers read same school" ON public.drivers FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "drivers admin write" ON public.drivers FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()));
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transport_routes ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.transport_routes ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  sequence int NOT NULL DEFAULT 0,
  pickup_time time,
  drop_time time,
  lat numeric,
  lng numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route_stops read same school" ON public.route_stops FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "route_stops admin write" ON public.route_stops FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'transport'))
             AND school_id = public.auth_school_id()));

-- Fees tables
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'one_time',
  due_day int,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structures read same school" ON public.fee_structures FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "fee_structures admin/accountant write" ON public.fee_structures FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()));
CREATE TRIGGER trg_fee_structures_updated BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  fine numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_invoices TO authenticated;
GRANT ALL ON public.fee_invoices TO service_role;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_invoices read scope" ON public.fee_invoices FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
        AND school_id = public.auth_school_id())
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.parent_has_student(auth.uid(), student_id)
  );
CREATE POLICY "fee_invoices admin/accountant write" ON public.fee_invoices FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()));
CREATE TRIGGER trg_fee_invoices_updated BEFORE UPDATE ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student ON public.fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status ON public.fee_invoices(school_id, status);

CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'flat',
  value numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_discounts TO authenticated;
GRANT ALL ON public.fee_discounts TO service_role;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_discounts read same school" ON public.fee_discounts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "fee_discounts admin/accountant write" ON public.fee_discounts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()));

CREATE TABLE IF NOT EXISTS public.fee_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  per_day_amount numeric(12,2) NOT NULL DEFAULT 0,
  grace_days int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_fines TO authenticated;
GRANT ALL ON public.fee_fines TO service_role;
ALTER TABLE public.fee_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_fines read same school" ON public.fee_fines FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.auth_school_id());
CREATE POLICY "fee_fines admin/accountant write" ON public.fee_fines FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR ((public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant'))
             AND school_id = public.auth_school_id()));

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  status text NOT NULL DEFAULT 'active',
  seats int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs super admin all" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "subs school read own" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'school_admin') AND school_id = public.auth_school_id());
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_subs_school ON public.subscriptions(school_id);

-- Notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_homework_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE _student record;
BEGIN
  FOR _student IN
    SELECT s.user_id FROM public.students s
    WHERE s.school_id = NEW.school_id
      AND (NEW.class_id IS NULL OR s.class_id = NEW.class_id)
      AND (NEW.section_id IS NULL OR s.section_id = NEW.section_id)
      AND s.user_id IS NOT NULL
  LOOP
    PERFORM public.create_notification(_student.user_id, 'homework',
      'New homework: ' || COALESCE(NEW.title,'Untitled'),
      'Due ' || COALESCE(NEW.due_date::text,'soon'), NEW.school_id);
  END LOOP;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_homework_notify ON public.homework;
CREATE TRIGGER trg_homework_notify AFTER INSERT ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.notify_homework_assigned();

CREATE OR REPLACE FUNCTION public.notify_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE _u record;
BEGIN
  FOR _u IN SELECT id AS user_id FROM public.profiles WHERE school_id = NEW.school_id
  LOOP
    PERFORM public.create_notification(_u.user_id, 'announcement',
      NEW.title, LEFT(COALESCE(NEW.body,''), 200), NEW.school_id);
  END LOOP;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_announcement_notify ON public.announcements;
CREATE TRIGGER trg_announcement_notify AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement();

CREATE OR REPLACE FUNCTION public.notify_fee_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE _student_user uuid; _parent record;
BEGIN
  SELECT user_id INTO _student_user FROM public.students WHERE id = NEW.student_id;
  IF _student_user IS NOT NULL THEN
    PERFORM public.create_notification(_student_user, 'fee',
      'Fee invoice: ' || NEW.title,
      'Amount ' || NEW.amount::text || ' due ' || COALESCE(NEW.due_date::text,'soon'),
      NEW.school_id);
  END IF;
  FOR _parent IN
    SELECT p.user_id FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = NEW.student_id AND p.user_id IS NOT NULL
  LOOP
    PERFORM public.create_notification(_parent.user_id, 'fee',
      'Fee invoice for your child: ' || NEW.title,
      'Amount ' || NEW.amount::text, NEW.school_id);
  END LOOP;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_fee_invoice_notify ON public.fee_invoices;
CREATE TRIGGER trg_fee_invoice_notify AFTER INSERT ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_fee_invoice();

CREATE OR REPLACE FUNCTION public.notify_exam_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE _u record;
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    FOR _u IN
      SELECT s.user_id FROM public.students s
      WHERE s.school_id = NEW.school_id AND (NEW.class_id IS NULL OR s.class_id = NEW.class_id)
        AND s.user_id IS NOT NULL
    LOOP
      PERFORM public.create_notification(_u.user_id, 'exam',
        'Results published: ' || COALESCE(NEW.name,'Exam'), NULL, NEW.school_id);
    END LOOP;
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_exam_notify ON public.exams;
CREATE TRIGGER trg_exam_notify AFTER UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.notify_exam_published();

-- Storage RLS
DROP POLICY IF EXISTS "avatars read auth" ON storage.objects;
CREATE POLICY "avatars read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars owner write" ON storage.objects;
CREATE POLICY "avatars owner write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "school-logos read auth" ON storage.objects;
CREATE POLICY "school-logos read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'school-logos');
DROP POLICY IF EXISTS "school-logos admin write" ON storage.objects;
CREATE POLICY "school-logos admin write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'school-logos'
         AND (public.is_super_admin(auth.uid())
              OR (public.has_role(auth.uid(),'school_admin')
                  AND (storage.foldername(name))[1] = public.auth_school_id()::text)))
  WITH CHECK (bucket_id = 'school-logos'
         AND (public.is_super_admin(auth.uid())
              OR (public.has_role(auth.uid(),'school_admin')
                  AND (storage.foldername(name))[1] = public.auth_school_id()::text)));

DO $bucket_loop$ DECLARE b text;
BEGIN
  FOR b IN SELECT unnest(ARRAY['documents','assignments','report-cards','fee-receipts']) LOOP
    EXECUTE format($pol$DROP POLICY IF EXISTS "%1$s read same school" ON storage.objects$pol$, b);
    EXECUTE format($pol$CREATE POLICY "%1$s read same school" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = '%1$s'
             AND (public.is_super_admin(auth.uid())
                  OR (storage.foldername(name))[1] = public.auth_school_id()::text))$pol$, b);
    EXECUTE format($pol$DROP POLICY IF EXISTS "%1$s staff write" ON storage.objects$pol$, b);
    EXECUTE format($pol$CREATE POLICY "%1$s staff write" ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = '%1$s'
             AND (public.is_super_admin(auth.uid())
                  OR ((public.has_role(auth.uid(),'school_admin')
                       OR public.has_role(auth.uid(),'teacher')
                       OR public.has_role(auth.uid(),'accountant'))
                      AND (storage.foldername(name))[1] = public.auth_school_id()::text)))
      WITH CHECK (bucket_id = '%1$s'
             AND (public.is_super_admin(auth.uid())
                  OR ((public.has_role(auth.uid(),'school_admin')
                       OR public.has_role(auth.uid(),'teacher')
                       OR public.has_role(auth.uid(),'accountant'))
                      AND (storage.foldername(name))[1] = public.auth_school_id()::text)))$pol$, b);
  END LOOP;
END $bucket_loop$;
