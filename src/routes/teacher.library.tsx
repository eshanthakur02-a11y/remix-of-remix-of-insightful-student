import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/teacher/library")({ component: () => (
  <>
    <PageHeader title="Library" description="Borrow and return books." />
    <EmptyState icon={Library} title="Coming next" description="Library for teachers ships in the next sub-wave." />
  </>
)});
