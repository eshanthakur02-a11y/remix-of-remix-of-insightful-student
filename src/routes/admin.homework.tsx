import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin/homework")({ component: Page });
function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <PageHeader title="Homework" description="Assign and track homework across classes." />
      <EmptyState icon={NotebookPen} title="Coming in Wave 2" description="Homework module is being built." />
    </RoleShell>
  );
}
