# Wave 2 — Academics ERP Build Plan

This is a large wave. I'll ship it in 4 sequenced sub-waves, each independently testable. After all four, I'll run the verification pass and report.

---

## Sub-wave 2A — Schema & Infrastructure (1 migration)

Extend the database to support real ERP workflows. School-scoped, session-aware, RLS-locked, with GRANTs.

**New tables**
- `homework` — title, description, subject_id, class_id, section_id, teacher_id, due_date, attachments (jsonb), status (active/archived), session_id
- `homework_submissions` — homework_id, student_id, submitted_at, attachments, note, status (pending/submitted/late/graded), grade
- `book_categories`, `book_authors`, `book_publishers`
- `books` — title, isbn, category_id, author_id, publisher_id, total_copies, available_copies
- `book_loans` — book_id, borrower_user_id, borrower_role, issued_at, due_at, returned_at, fine_amount, status
- `exam_grades` (config) — school_id, min_pct, max_pct, grade, gpa
- Extend `exams` with `exam_type` (internal/final/unit_test/practical), `is_published`
- Extend `exam_results` with `published_at`

**RLS**
- All tables: school-scoped via `auth_school_id()` + `is_super_admin()`
- Teachers: write on rows they own; Students/Parents: read scoped to self/child
- Use existing `has_role`, `parent_has_student`, `auth_role` helpers

**Storage buckets**
- Reuse `assignments` (homework attachments), `documents` (book covers)

**Triggers**
- Notification triggers on homework create, exam publish, book loan/return, due-date warnings (via server fn cron-style on demand)

---

## Sub-wave 2B — Homework Module

**Routes**
- `/teacher/homework` — list (DataTable: search/sort/filter by class/subject/status, pagination, CSV), create/edit/delete/archive dialogs, file upload to `assignments` bucket
- `/teacher/homework/$id` — submissions table + grade entry
- `/student/homework` — list assigned + submit dialog (file upload, note)
- `/parent/homework` — child's homework (uses child selector already in parent shell)
- `/admin/homework` — read-only across school + submission stats card

**Server fns** (`src/lib/homework.functions.ts`) for create/update/delete/archive/submit/grade, all `requireSupabaseAuth` + role check, `log_audit` + `create_notification` to assigned students.

---

## Sub-wave 2C — Library Module

**Routes**
- `/admin/library` — tabs: Books | Categories | Authors | Publishers; full CRUD via DataTable
- `/admin/library/loans` — issue/return, search, fine calc
- `/student/library`, `/teacher/library` — browse + my loans + borrow history

**Logic** Fine = max(0, days_overdue * school.features.fine_per_day || 5). Auto-decrement `available_copies` on issue; increment on return. Notifications on issue, return, and overdue (computed on read).

---

## Sub-wave 2D — Timetable Builder

**Route**
- `/admin/timetable` — grid view: rows = periods (1-8), cols = Mon-Fri. Class+Section+Session selectors. Click cell → assign Subject+Teacher+Room. Conflict detection: teacher already booked same period or room collision shows red + blocks save.
- "Copy from previous session" action: bulk copy timetable rows for selected class/section.
- `/teacher/timetable`, `/student/timetable`, `/parent/timetable` — read-only grid for current user/child.

Drag-and-drop deferred to nice-to-have; click-to-edit ships v1.

---

## Sub-wave 2E — Exams & Results

**Routes**
- `/admin/exams` — DataTable with exam_type filter, CRUD. Create exam = exam + max_marks per subject.
- `/teacher/exams` — list assigned exams; `/teacher/exams/$id/marks` — bulk marks entry table (one row per student × subject), save draft, **Publish** action gates student visibility.
- `/student/results` — published exams only, with grade/percentage/GPA + Report Card view (printable, reuses existing report-card layout)
- `/parent/results` — same scoped to selected child
- `/admin/grades` — manage grade scale config

**Computation** Grade & GPA derived from `exam_grades` table; percentage = sum(obtained) / sum(max) × 100.

---

## Sub-wave 2F — Teacher Dashboard Refresh

Build `/teacher` index with KPI cards (My Classes, Students Taught, Pending Homework Submissions, Upcoming Exams), Today's Timetable strip, Recent Announcements, Quick Actions (Mark Attendance / New Homework / Enter Marks). Sidebar already has the 13 modules; add any missing route stubs (Marks → results, Reports, Profile, Student Profiles list scoped to assigned sections).

---

## Sub-wave 2G — Verification & Report

Run automated check script (`scripts/verify-wave2.mjs`) that:
1. Logs in as each demo account
2. Hits every new route via SSR fetch
3. Validates CRUD as teacher_math (create homework → student1 submits → grade → publish)
4. Validates RLS isolation (teacher_eng cannot see math homework submissions)
5. Validates exam publish gate (unpublished invisible to student)
6. Validates timetable conflict rejection
7. Validates library loan/return + fine

Then output: ✅/❌ per requirement and "Wave 2 Verified — Ready for Wave 3" or list remaining gaps.

---

## Tech notes (technical section)

- All server fns colocated as `*.functions.ts` under `src/lib/`, never in `src/server/`
- Reuse `DataTable`, `PageHeader`, `ConfirmDialog`, `ErrorState`, `EmptyState`, `TableSkeleton`
- TanStack Query default read shape (`ensureQueryData` + `useSuspenseQuery`)
- File uploads via `supabase.storage.from('assignments').upload(...)`, store path in `attachments` jsonb array
- Notifications via existing `create_notification(_user_id, _kind, _title, _body, _school_id)` RPC
- Audit via `log_audit(_action, _entity, _entity_id, _school_id, _meta)` RPC
- Every new route under `_authenticated/` (already managed gate)

---

## Scope check before I start

This is ~30 routes, 1 large migration, ~12 server-fn modules, and a verification script. Estimated 6–8 turns to complete cleanly with build green at each sub-wave.

**Reply "go" to start with Sub-wave 2A (the migration), or tell me to reorder / cut any module before I begin.**
