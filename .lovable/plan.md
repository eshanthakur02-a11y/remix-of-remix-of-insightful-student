
## Phase 2 — ERP Foundation

Routes stay (`/superadmin`, `/admin`, `/teacher`, `/student`, `/parent`, `/accountant`). Server functions stay. `school_admin` stays. Student login stays as generated credentials, but gated by a new per-school flag so it can be disabled later without schema changes.

---

### 1. Schema additions (single migration)

- `schools.features jsonb not null default '{"student_login": true}'::jsonb` — per-school feature flags. Future flags (n8n, ai, whatsapp, payments) live here, no schema churn.
- `schools.current_session_id uuid` (nullable FK to `academic_sessions`).
- New `academic_sessions` table: `id, school_id, name ('2025-26'), start_date, end_date, is_current bool, status`. RLS scoped by school. Used by `teacher_assignments`.
- `teacher_assignments` gains `session_id uuid` (nullable for back-compat).
- `classes`: add unique `(school_id, name, status)` partial index where `status='active'`. `sections`: add unique `(class_id, name)` where `status='active'` to block duplicate section names per class.
- New `audit_logs` table (id, school_id, actor_user_id, action, entity, entity_id, meta jsonb, created_at) — table only; writes added incrementally later.
- New `notifications` table (id, school_id, user_id, kind, title, body, read_at, created_at) — table only.
- Helper RPC `delete_class_if_unreferenced(_id uuid)` and `delete_section_if_unreferenced(_id uuid)` — security definer, checks `students`, `sections`, `timetable`, `teacher_assignments`, `exams`, `fees` before deleting; otherwise raises.
- All new tables get GRANTs + RLS scoped via `auth_school_id()` / `has_role()`.

### 2. Server functions (extend `src/lib/admin-users.functions.ts` + new files)

- `resetStaffPassword({user_id})` — symmetric to `resetStudentPassword`, school-admin scoped.
- `setStudentLoginEnabled({school_id, enabled})` — super_admin only, toggles `schools.features.student_login`.
- `assignTeacher({teacher_id, subject_id, class_id, section_id, session_id})` and `unassignTeacher({id})` — school_admin scoped, validates same-school.
- `archiveClass`, `unarchiveClass`, `deleteClass` (calls RPC), and the section equivalents.
- `getMyChildren()` for parent dashboard (returns linked students + summary).
- `setSchoolStatus` already exists — UI wires to it.

### 3. UI work

**Admin → Classes & Sections** (`src/routes/admin.classes.tsx`)
- Rewrite using custom table (not generic `CrudTable`) so we get Archive/Delete actions, status filter, and the cascading section editor. Section create form's Class dropdown filters its own list.

**Admin → Students** (`src/routes/admin.students.tsx`)
- Replace `CrudTable` with a new `StudentManager` component.
- "Add student" opens a dialog calling `createStudentWithParent`. Class select → Section select is dynamically filtered (`useEffect` on class change). Parent block included. On success, shows generated student email + temp password in a one-time toast/modal with copy buttons.
- Row actions: Reset password (calls `resetStudentPassword`, shows new temp pw once), Edit profile (non-auth fields only).

**Admin → Teachers** (`src/routes/admin.teachers.tsx`)
- "Invite teacher" dialog → `createStaffUser({role:'teacher'})`.
- Row actions: Reset password, Manage assignments (opens `TeacherAssignmentsDialog`).

**Admin → Teacher Assignments** (new `src/components/TeacherAssignmentsDialog.tsx`)
- Lists current assignments for the teacher. Add form: Subject → Class → Section (cascaded) → Session. Calls `assignTeacher`. Remove button per row.

**Admin → Accountant / Transport pages**
- Same invite pattern via `createStaffUser`.

**Super Admin → Schools** (`src/routes/superadmin.schools.tsx`)
- Custom table with Status badge + Suspend/Activate button (`setSchoolStatus`) and Student-login toggle (`setStudentLoginEnabled`).
- "Invite school admin" row action → `createSchoolAdmin`.

**Unified Student/Parent dashboard**
- Shared components in `src/components/student-view/` : `AttendancePanel`, `ResultsPanel`, `HomeworkPanel`, `TimetablePanel`, each taking `studentId` as a prop.
- `src/routes/student.index.tsx` renders panels for `auth.user`'s student row.
- `src/routes/parent.index.tsx` renders a `<ChildSwitcher>` (hidden if 1 child) then the same panels for the selected `studentId`. Child list comes from `getMyChildren()`.
- Existing per-feature student routes (`student.attendance.tsx`, etc.) reuse the same panels.

**Suspension enforcement**
- Already handled in `useAuth` and `login.tsx`. Add a session-level recheck: `RoleShell` polls school status on mount and signs out if suspended, so users who are suspended mid-session get bounced on next navigation.

### 4. Architectural prep (no UI)

- `features` jsonb on schools + helper `school_feature(_school_id, _key)` SQL function so future modules (`ai`, `n8n`, `whatsapp`, `payments`, `maps`) read flags consistently.
- `academic_sessions` table exists and is referenced by assignments; UI for managing sessions ships later but data model is ready.
- `audit_logs` + `notifications` tables exist; write helpers stubbed but not wired into every flow yet.
- Storage buckets: not created in this phase (zero current consumers); documented as next-phase prep.

### 5. Deliverable summary (returned to user at end of phase)

A short report covering: schema diff, auth flow recap, the new user-creation flow, class/section lifecycle, teacher-assignment model, dashboard routing map, and the remaining checklist before module work (Attendance, Exams, Homework, Fees, Timetable, Reports).

---

### Out of scope this phase
AI, n8n, WhatsApp, SMS, Email, Payments, Google Maps. Storage buckets. Full audit-log write coverage. Notifications UI. Academic-session management UI (table exists, but CRUD ships with the modules that need it).

### Technical notes
- One Supabase migration, applied first; types regenerate; then code lands.
- All privileged actions go through server functions with `requireSupabaseAuth` + role check — no direct role-table inserts from the client.
- Cascading dropdowns use a single `sections` fetch filtered client-side by `class_id` to avoid extra round-trips.
- Generated student credentials are shown exactly once in a modal with copy buttons; never stored in app tables.
