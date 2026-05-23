
-- Classes
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;
create policy "classes read all auth" on public.classes for select to authenticated using (true);
create policy "classes admin all" on public.classes for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Sections
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);
alter table public.sections enable row level security;
create policy "sections read all auth" on public.sections for select to authenticated using (true);
create policy "sections admin all" on public.sections for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  created_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create policy "subjects read all auth" on public.subjects for select to authenticated using (true);
create policy "subjects admin all" on public.subjects for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  admission_no text unique,
  full_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  parent_name text,
  parent_phone text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.students enable row level security;
create policy "students self read" on public.students for select to authenticated
  using (user_id = auth.uid());
create policy "students admin all" on public.students for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "students teacher read" on public.students for select to authenticated
  using (has_role(auth.uid(), 'teacher'));
create policy "students accountant read" on public.students for select to authenticated
  using (has_role(auth.uid(), 'accountant'));
create policy "students transport read" on public.students for select to authenticated
  using (has_role(auth.uid(), 'transport'));

-- Teachers
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  employee_no text unique,
  full_name text not null,
  phone text,
  qualification text,
  created_at timestamptz not null default now()
);
alter table public.teachers enable row level security;
create policy "teachers read auth" on public.teachers for select to authenticated using (true);
create policy "teachers admin all" on public.teachers for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Teacher subjects (assignments)
create table public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.teacher_subjects enable row level security;
create policy "ts read auth" on public.teacher_subjects for select to authenticated using (true);
create policy "ts admin all" on public.teacher_subjects for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Attendance
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','late','leave')),
  marked_by uuid,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
alter table public.attendance enable row level security;
create policy "att admin all" on public.attendance for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "att teacher all" on public.attendance for all to authenticated
  using (has_role(auth.uid(), 'teacher')) with check (has_role(auth.uid(), 'teacher'));
create policy "att student self" on public.attendance for select to authenticated
  using (exists (select 1 from public.students s where s.id = attendance.student_id and s.user_id = auth.uid()));

-- Timetable
create table public.timetable (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);
alter table public.timetable enable row level security;
create policy "tt read auth" on public.timetable for select to authenticated using (true);
create policy "tt admin all" on public.timetable for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Exams
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references public.classes(id) on delete cascade,
  exam_date date,
  created_at timestamptz not null default now()
);
alter table public.exams enable row level security;
create policy "exams read auth" on public.exams for select to authenticated using (true);
create policy "exams admin all" on public.exams for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  marks numeric not null,
  max_marks numeric not null default 100,
  created_at timestamptz not null default now(),
  unique (exam_id, student_id, subject_id)
);
alter table public.exam_results enable row level security;
create policy "er admin all" on public.exam_results for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "er teacher all" on public.exam_results for all to authenticated
  using (has_role(auth.uid(), 'teacher')) with check (has_role(auth.uid(), 'teacher'));
create policy "er student self" on public.exam_results for select to authenticated
  using (exists (select 1 from public.students s where s.id = exam_results.student_id and s.user_id = auth.uid()));

-- Fees
create table public.fees (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  amount numeric not null,
  due_date date,
  created_at timestamptz not null default now()
);
alter table public.fees enable row level security;
create policy "fees read auth" on public.fees for select to authenticated using (true);
create policy "fees admin all" on public.fees for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "fees accountant all" on public.fees for all to authenticated
  using (has_role(auth.uid(), 'accountant')) with check (has_role(auth.uid(), 'accountant'));

create table public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references public.fees(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount_paid numeric not null,
  paid_at timestamptz not null default now(),
  method text,
  reference text
);
alter table public.fee_payments enable row level security;
create policy "fp admin all" on public.fee_payments for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "fp accountant all" on public.fee_payments for all to authenticated
  using (has_role(auth.uid(), 'accountant')) with check (has_role(auth.uid(), 'accountant'));
create policy "fp student self" on public.fee_payments for select to authenticated
  using (exists (select 1 from public.students s where s.id = fee_payments.student_id and s.user_id = auth.uid()));

-- Transport
create table public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle_no text,
  driver_name text,
  driver_phone text,
  created_at timestamptz not null default now()
);
alter table public.transport_routes enable row level security;
create policy "tr read auth" on public.transport_routes for select to authenticated using (true);
create policy "tr admin all" on public.transport_routes for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "tr transport all" on public.transport_routes for all to authenticated
  using (has_role(auth.uid(), 'transport')) with check (has_role(auth.uid(), 'transport'));

create table public.student_transport (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  pickup_point text,
  created_at timestamptz not null default now(),
  unique (student_id)
);
alter table public.student_transport enable row level security;
create policy "st admin all" on public.student_transport for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "st transport all" on public.student_transport for all to authenticated
  using (has_role(auth.uid(), 'transport')) with check (has_role(auth.uid(), 'transport'));
create policy "st student self" on public.student_transport for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_transport.student_id and s.user_id = auth.uid()));

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  audience text not null default 'all' check (audience in ('all','students','teachers','accountants','transport')),
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "ann read auth" on public.announcements for select to authenticated using (true);
create policy "ann admin all" on public.announcements for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "msg participants read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "msg send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
create policy "msg update own" on public.messages for update to authenticated
  using (recipient_id = auth.uid());
