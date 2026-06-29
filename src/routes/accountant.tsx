import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { accountantNav } from "@/lib/nav";

export const Route = createFileRoute("/accountant")({
  component: () => (
    <RoleShell role="accountant" navItems={accountantNav}>
      <Outlet />
    </RoleShell>
  ),
});
