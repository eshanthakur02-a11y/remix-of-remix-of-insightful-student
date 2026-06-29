import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { teacherNav } from "@/lib/nav";

export const Route = createFileRoute("/teacher")({
  component: () => (
    <RoleShell role="teacher" navItems={teacherNav}>
      <Outlet />
    </RoleShell>
  ),
});
