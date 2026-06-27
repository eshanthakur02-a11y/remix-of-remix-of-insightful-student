import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { teacherNav } from "@/lib/nav";

export const Route = createFileRoute("/teacher/library")({ component: () => (
  <RoleShell role="teacher" navItems={teacherNav}>
    <PageHeader title="Library" description="Borrow and return books." />
    <EmptyState icon={Library} title="Coming next" description="Library for teachers ships in the next sub-wave." />
  </RoleShell>
)});
