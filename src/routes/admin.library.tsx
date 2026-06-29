import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/library")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Library" description="Books, loans and returns." />
      <EmptyState icon={Library} title="Coming in Wave 2" description="Library module is being built." />
    </>
  );
}
