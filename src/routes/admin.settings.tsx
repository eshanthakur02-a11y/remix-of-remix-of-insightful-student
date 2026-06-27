import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin/settings")({ component: Page });
function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <PageHeader title="School Settings" description="School profile, logo, sessions, feature toggles." />
      <EmptyState icon={Settings} title="Coming in Wave 4" description="Settings module is being built." />
    </RoleShell>
  );
}
