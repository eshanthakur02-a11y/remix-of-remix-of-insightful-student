import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { studentNav } from "@/lib/nav";

export const Route = createFileRoute("/student/library")({ component: () => (
  <RoleShell role="student" navItems={studentNav}>
    <PageHeader title="Library" description="Browse books and your borrow history." />
    <EmptyState icon={Library} title="Coming next" description="Library for students ships in the next sub-wave." />
  </RoleShell>
)});
