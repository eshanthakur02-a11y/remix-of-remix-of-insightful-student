import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/student/library")({ component: () => (
  <>
    <PageHeader title="Library" description="Browse books and your borrow history." />
    <EmptyState icon={Library} title="Coming next" description="Library for students ships in the next sub-wave." />
  </>
)});
