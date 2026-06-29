import { createFileRoute } from "@tanstack/react-router";
import { UserCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/attendance")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Attendance Register" description="School-wide attendance overview." />
      <EmptyState icon={UserCheck} title="Coming in Wave 3" description="Attendance register is being built." />
    </>
  );
}
