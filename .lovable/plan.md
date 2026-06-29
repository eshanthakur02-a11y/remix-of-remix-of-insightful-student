# Phase X — Performance & SPA Experience

No new ERP features. Goal: make Scholaris feel like Linear/Notion — instant nav, cached data, skeletons everywhere, no full reloads.

Delivered in 3 waves so each is verifiable before the next.

---

## Wave A — SPA shell + Query foundation

The biggest perceived-speed wins. Everything else builds on this.

1. **Persistent shell.** Refactor so `Sidebar`, `Header`, `NotificationBell`, `ChatBot` mount **once** at a role-layout level (`admin.tsx`, `teacher.tsx`, `student.tsx`, `parent.tsx`, `accountant.tsx`, `transport.tsx`, `superadmin.tsx`) — child routes only swap the `<Outlet />` content. Today each page re-renders `RoleShell` from scratch on every nav, which is the main cause of the "reload" feel.
2. **TanStack Query everywhere.** Wire `QueryClient` into router context (per-request in `getRouter`, `defaultPreloadStaleTime: 0`). Convert all `useEffect + supabase.from(...)` reads to `queryOptions` + `useSuspenseQuery` with the loader pattern. Sensible defaults: `staleTime: 60_000`, `gcTime: 5min`, `retry: 1`.
3. **Route prefetching.** `defaultPreload: "intent"` on the router + `preload="intent"` on sidebar `<Link>`s. Prefetches both JS chunk and loader data on hover.
4. **Skeletons.** Add `pendingComponent` with `TableSkeleton` / card skeletons on every route that fetches. Standard loading/empty/error/success states using existing `EmptyState` + `ErrorState`.

## Wave B — Data layer & dashboards

5. **Dashboard progressive render.** Admin/Teacher/Student dashboards: KPI cards first (small queries), charts second (streamed via `prefetchQuery`, no await), tables/widgets third. Parallel `Promise.all` for independent queries.
6. **Server-side pagination** on heavy tables: students, teachers, parents, attendance, homework, exams, fees, notifications, audit logs, messages. Standard `range()` + `count: 'exact', head: true` pattern; cursor or page number in URL search params.
7. **Column trimming.** Audit every `.select()` — replace `*` with explicit column lists. Add DB indexes for hot filters: `attendance(school_id, date)`, `homework(class_id, due_date)`, `audit_logs(school_id, created_at desc)`, `notifications(user_id, read_at)`, `messages(thread_id, created_at)`.
8. **Optimistic updates** for the high-frequency actions: attendance toggle, homework submit, message send, announcement post, mark-notification-read. Rollback on error via Query's `onMutate`/`onError`.

## Wave C — Bundle + polish

9. **Lazy-load heavy routes.** Reports, Library, Transport, Insights, Analytics charts → `.lazy.tsx` split. Keep dashboards critical.
10. **Virtual scrolling** (`@tanstack/react-virtual`) for students, attendance roster, audit logs, notifications when row count > 100.
11. **Bundle audit.** Tree-shake lucide imports already individual ✓; check Recharts (heavy) — lazy-load chart components, swap any unused deps. Run `vite build` and report before/after gzipped size.
12. **Memoization.** Targeted `React.memo` on `DataTable` row, `StatCard`, chart components. `useMemo` for derived chart data. No blanket wrapping.
13. **Perf report.** Measure with Playwright + Chrome perf: initial load, dashboard TTI, nav time, bundle size. Before/after table + remaining bottlenecks.

---

## Technical notes

- Per-request `QueryClient` in `getRouter` is required for SSR safety (current `src/router.tsx` uses a module-level client — fix in Wave A).
- `RoleShell` is currently rendered inside each page (`admin.index.tsx`, `admin.teachers.tsx`, etc.). Migrating it to layout routes is mechanical but touches ~60 route files — done with codemod-style edits.
- Existing `.lazy.tsx` splitting is not used anywhere yet; introducing it is pure win for non-critical pages.
- DB index additions ship as one migration at the end of Wave B.

## Out of scope

- New modules, UI redesigns, new ERP features.
- Auth changes, RLS changes.
- Realtime additions (only remove/scope down if duplicating Query).

---

Reply **"go A"** to start with the shell + Query foundation, or **"go all"** to ship A → B → C sequentially with checkpoints between waves.