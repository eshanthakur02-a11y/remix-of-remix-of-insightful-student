
# Phase 1 Final Completion Plan

Goal: every menu item in every role opens a working page backed by real Supabase data, with CRUD, RLS, filters, pagination, loading/empty/error states, and notifications. No mock data, no "Coming Soon".

I will ship this in 6 waves. Each wave ends with a verification pass (lint + route smoke test + RLS check) before the next begins. You approve at the end of each wave.

## Current state (already shipped)

- 37 demo accounts, 5 role layouts with persistent shell, TanStack Query caching, optimistic CRUD.
- Tables exist for: schools, profiles, user_roles, classes, sections, subjects, students, teachers, parents, parent_students, teacher_assignments, teacher_subjects, attendance, exams, exam_results, exam_grades, fees, fee_payments, homework, homework_submissions, books, book_loans, book_categories, book_authors, book_publishers, timetable, transport_routes, student_transport, messages, announcements, notifications, audit_logs, academic_sessions.
- Working: admin dashboard, students, teachers, classes, sections, subjects, homework, announcements, library skeleton, attendance entry, timetable, exams shell, student/parent portals.

## Gaps to close (this phase)

Database additions needed:
- `vehicles`, `drivers`, `route_stops` (transport completion)
- `fee_structures`, `fee_invoices`, `fee_discounts`, `fee_fines` (accountant completion)
- `feature_flags` per school (already on `schools.features` jsonb — wire UI)
- `subscriptions` table (super admin)
- `book_fines` view
- triggers to emit notifications on key events

## Wave breakdown

### Wave 1 — Schema completion + Storage policies
- Migrations: vehicles, drivers, route_stops, fee_structures, fee_invoices, fee_discounts, fee_fines, subscriptions.
- Storage RLS for 6 buckets (avatars, documents, assignments, report-cards, fee-receipts, school-logos).
- Notification trigger functions (attendance marked, homework assigned, marks published, fee due, announcement posted).
- File upload helper `src/lib/storage.ts`.

### Wave 2 — Super Admin completion
- `superadmin.schools`: full CRUD + suspend/activate + feature flags editor + search.
- `superadmin.admins`: invite, reset pw, suspend, delete.
- `superadmin.subscriptions`: plans, expiry, renewal.
- `superadmin.audit`: full activity log with filters.
- `superadmin.settings`: platform config.
- Dashboard: real schools/users/growth KPIs + charts.

### Wave 3 — School Admin completion (largest)
- Finish: teacher assignments UI, exams (create/schedule/publish), marks entry, results publishing with grade/percentage/rank, fees (structure → invoices → collection → receipts), library (issue/return/fine), reports center (PDF + Excel via window.print + xlsx), academic sessions switcher, announcements targeting, notifications center.
- Wire bulk actions, pagination, advanced filters across all admin tables.

### Wave 4 — Teacher + Student + Parent completion
- Teacher: my classes, my subjects, marks entry, results view, student profiles drill-down, messages, reports, profile editor.
- Student: attendance, homework, results, subjects, timetable, library (my loans), fees (my invoices), transport (my route), announcements, notifications, profile.
- Parent: child selector, per-child mirrors of student views, messages.

### Wave 5 — Accountant + Transport completion
- Accountant: fee structure designer, invoice generation, receipts (printable), collections, pending, discounts, fines, analytics charts.
- Transport: vehicles CRUD, drivers CRUD, routes with stops, student assignment, route map (static OSM tile w/ markers — no paid API), reports.

### Wave 6 — Hardening + Audit Report
- Lint pass, RLS verification script, route smoke test (all menu items), notification trigger test, mobile responsive sweep, empty-state pass on every list.
- Deliverable: ERP audit report (completed modules, remaining issues, perf notes, security notes, production-readiness score, AI-readiness score).

## Technical details

- All new tables follow the GRANT → RLS → POLICY structure; `service_role` always granted, `anon` only for fully public reads (none in this phase).
- RLS pattern: `school_id = auth_school_id()` for school-scoped tables; `is_super_admin(auth.uid())` bypass; role-specific writes via `has_role()`.
- Notifications via `create_notification()` from new AFTER INSERT/UPDATE triggers — no client-side fan-out.
- Reports: PDF via `window.print()` with print-stylesheet (no jspdf bloat); Excel via `xlsx` (already small, lazy-loaded).
- File uploads: signed URLs for private buckets; per-bucket RLS policies scoping by `school_id` folder prefix.
- No new third-party integrations (no n8n, no Stripe, no Twilio, no AI) — explicitly out of scope.

## Risk callouts

- Schema migrations require approval per call — Wave 1 alone is ~8 migrations.
- Fee/exam workflows touch many existing routes; expect Wave 3 to span multiple turns.
- I will NOT mark a wave complete until its smoke test passes; partial waves will be paused and reported, not papered over.

## What I need from you

Reply with one of:
1. **"go"** — I start Wave 1 immediately (schema + storage).
2. **"reorder X first"** — bump a wave up if you want a specific dashboard done first.
3. **"skip X"** — drop a wave (e.g. if subscriptions aren't needed yet).
