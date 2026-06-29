import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/audit")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Audit Logs" description="All sensitive actions across the school." />
      <EmptyState icon={FileText} title="Coming in Wave 4" description="Audit log viewer is being built." />
    </>
  );
}
