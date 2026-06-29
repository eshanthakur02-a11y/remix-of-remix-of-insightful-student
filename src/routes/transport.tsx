import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { transportNav } from "@/lib/nav";

export const Route = createFileRoute("/transport")({
  component: () => (
    <RoleShell role="transport" navItems={transportNav}>
      <Outlet />
    </RoleShell>
  ),
});
