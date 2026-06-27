import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin/parents")({ component: Page });
function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <PageHeader title="Parents" description="Parent directory and linkage." />
      <EmptyState icon={Heart} title="Coming in Wave 3" description="Parent management is being built." />
    </RoleShell>
  );
}
