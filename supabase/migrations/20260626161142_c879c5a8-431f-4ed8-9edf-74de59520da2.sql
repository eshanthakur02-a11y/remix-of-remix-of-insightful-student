
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_school(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.parent_has_student(uuid, uuid)  FROM PUBLIC, anon;
