import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/users")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="User Management" description="All accounts in your school." />
      <EmptyState icon={ShieldCheck} title="Coming in Wave 3" description="User management is being built." />
    </>
  );
}
