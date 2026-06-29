import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/admin/settings")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="School Settings" description="School profile, logo, sessions, feature toggles." />
      <EmptyState icon={Settings} title="Coming in Wave 4" description="Settings module is being built." />
    </>
  );
}
