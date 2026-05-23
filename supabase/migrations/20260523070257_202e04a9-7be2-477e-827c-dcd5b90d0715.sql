
-- Enum of roles
create type public.app_role as enum ('admin','teacher','student','accountant','transport');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Roles (separate table per security best-practice)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role security-definer helper
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- Policies: profiles
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "admin profile select" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);

-- Policies: user_roles
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid()=user_id);
create policy "admin roles select" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own roles insert" on public.user_roles for insert to authenticated with check (auth.uid()=user_id);
create policy "admin roles all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Trigger: on signup, create profile + role from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _role public.app_role;
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  begin
    _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  exception when others then
    _role := 'student'::public.app_role;
  end;

  insert into public.user_roles(user_id, role) values (new.id, _role);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
