import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin/library")({ component: Page });
function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <PageHeader title="Library" description="Books, loans and returns." />
      <EmptyState icon={Library} title="Coming in Wave 2" description="Library module is being built." />
    </RoleShell>
  );
}
