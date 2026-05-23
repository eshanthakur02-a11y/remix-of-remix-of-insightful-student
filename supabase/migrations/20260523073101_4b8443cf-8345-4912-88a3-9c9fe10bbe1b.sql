grant usage on schema public to authenticated, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon, public;
alter function public.has_role(uuid, public.app_role) owner to postgres;