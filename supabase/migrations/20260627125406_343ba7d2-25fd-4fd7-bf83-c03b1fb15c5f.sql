
-- AVATARS: per-user prefix = auth.uid()
CREATE POLICY "avatars read for signed-in" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Helper: same-school check for object path (first folder segment = school_id)
-- Generic policies for school-scoped buckets
CREATE POLICY "school-scoped read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('documents','school-logos','report-cards','fee-receipts','assignments')
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.auth_school_id()::text
    )
  );

-- Admins / teachers / accountants can write to most school buckets
CREATE POLICY "school-scoped write (staff)" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('documents','school-logos','report-cards','fee-receipts','assignments')
    AND (storage.foldername(name))[1] = public.auth_school_id()::text
    AND (
      public.has_role(auth.uid(),'school_admin')
      OR public.has_role(auth.uid(),'teacher')
      OR public.has_role(auth.uid(),'accountant')
      OR public.is_super_admin(auth.uid())
    )
  );
CREATE POLICY "school-scoped update (staff)" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('documents','school-logos','report-cards','fee-receipts','assignments')
    AND (storage.foldername(name))[1] = public.auth_school_id()::text
    AND (
      public.has_role(auth.uid(),'school_admin')
      OR public.has_role(auth.uid(),'teacher')
      OR public.has_role(auth.uid(),'accountant')
      OR public.is_super_admin(auth.uid())
    )
  );
CREATE POLICY "school-scoped delete (staff)" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('documents','school-logos','report-cards','fee-receipts','assignments')
    AND (storage.foldername(name))[1] = public.auth_school_id()::text
    AND (
      public.has_role(auth.uid(),'school_admin')
      OR public.is_super_admin(auth.uid())
    )
  );
