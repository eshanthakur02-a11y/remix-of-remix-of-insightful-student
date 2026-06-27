## School Admin Dashboard — Full Module Buildout (Prompt 1)

Scope is large (~40–60 screens). I'll deliver it in **4 sequential waves** so each wave is testable before the next. All work scoped to the `school_admin` role; other roles already exist as shells.

### Wave 1 — Foundation polish (this turn)
Make the admin experience production-grade before adding new modules.

- **Sidebar**: Collapsible grouped menu (Academics, People, Operations, Finance, Communication, System) with active-state highlighting and mobile drawer.
- **Dashboard Home**: Keep current KPIs; add Attendance-today %, Fees-collected-this-month, Pending-homework, Upcoming-exams. Add 2 charts (attendance trend 14d, fee collection 6mo).
- **Shared primitives**: `PageHeader`, `DataTable` (search + column filter + pagination + CSV export), `ConfirmDialog`, `FormDialog`, unified `EmptyState`/`TableSkeleton`/`ErrorState`.
- **Reports & Export**: CSV export utility wired into DataTable; PDF print stylesheet for report pages.
- **Permissions**: Centralize `can()` helper reading role + school_id; hide nav items the role can't access.

### Wave 2 — Academics modules
- Classes, Sections, Subjects (already exist → upgrade to new DataTable + bulk actions).
- **Timetable builder** (grid editor per section).
- **Homework** (new tables: `homework`, `homework_submissions`).
- **Exams & Results** (extend existing).
- **Library** (new tables: `books`, `book_loans`).

### Wave 3 — People & Operations
- Students, Teachers, Parents (upgrade existing → bulk import CSV, profile pages, document upload to `documents` bucket).
- **User Management** page (list every auth user in school, suspend/reactivate, reset password, role view).
- Transport (routes already exist → add vehicles, driver docs, live assignment view).
- Attendance (admin-wide register with daily/monthly heatmap).

### Wave 4 — Finance, Communication, System
- Fees (structures, invoices, payments, dues report).
- Accountant ledger view + receipt PDF.
- Announcements (targeted by role/class).
- Notifications center (already partial → add preferences).
- **Settings**: school profile, logo upload, academic session switcher, feature toggles.
- **Audit Logs** viewer with filters.
- AI Insights hook (uses Lovable AI Gateway) — risk students, fee defaulters, attendance anomalies.

### Technical notes
- New tables added per wave with proper GRANTs + RLS scoped via `auth_school_id()`.
- Reuse existing `CrudTable` only where it fits; build new `DataTable` for richer needs.
- All forms validated with `zod`.
- Mobile: sidebar → Sheet drawer < md; tables → card list < sm.
- Loading: skeletons everywhere. Errors: inline retry. Empty: CTA to create.

### Confirmation needed
Reply **"go wave 1"** to start, or tell me which wave to prioritize first. I won't build all 4 in one turn — each is ~30+ files.
