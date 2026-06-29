import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RoleShell role="school_admin" navItems={adminNav}>
      <Outlet />
    </RoleShell>
  ),
});
