import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/parents")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Parents" description="Parent directory and linkage." />
      <EmptyState icon={Heart} title="Coming in Wave 3" description="Parent management is being built." />
    </>
  );
}
