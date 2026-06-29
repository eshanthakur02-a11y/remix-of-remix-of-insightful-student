import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { studentNav } from "@/lib/nav";

export const Route = createFileRoute("/student")({
  component: () => (
    <RoleShell role="student" navItems={studentNav}>
      <Outlet />
    </RoleShell>
  ),
});
