import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { parentNav } from "@/lib/nav";

export const Route = createFileRoute("/parent")({
  component: () => (
    <RoleShell role="parent" navItems={parentNav}>
      <Outlet />
    </RoleShell>
  ),
});
