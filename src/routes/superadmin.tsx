import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { superAdminNav } from "@/lib/nav";

export const Route = createFileRoute("/superadmin")({
  component: () => (
    <RoleShell role="super_admin" navItems={superAdminNav}>
      <Outlet />
    </RoleShell>
  ),
});
