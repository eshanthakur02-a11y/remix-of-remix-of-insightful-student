import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/reports")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Reports" description="Generate and export school reports." />
      <EmptyState icon={FileBarChart} title="Coming in Wave 4" description="Reporting module is being built." />
    </>
  );
}
