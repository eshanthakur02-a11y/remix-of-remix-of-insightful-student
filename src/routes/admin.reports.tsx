import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin/reports")({ component: Page });
function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <PageHeader title="Reports" description="Generate and export school reports." />
      <EmptyState icon={FileBarChart} title="Coming in Wave 4" description="Reporting module is being built." />
    </RoleShell>
  );
}
