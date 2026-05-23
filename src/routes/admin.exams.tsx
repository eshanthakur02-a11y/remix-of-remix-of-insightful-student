import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/exams")({ component: Page });

function Page() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { supabase.from("classes").select("id,name").then(({ data }) => setClasses(data ?? [])); }, []);

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <CrudTable
        title="Exams"
        table="exams"
        columns={[
          { key: "name", label: "Name" },
          { key: "exam_date", label: "Date" },
          { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "All" },
        ]}
        fields={[
          { key: "name", label: "Exam name", required: true },
          { key: "exam_date", label: "Date", type: "date" },
          { key: "class_id", label: "Class", type: "select", options: classes.map((c) => ({ value: c.id, label: c.name })) },
        ]}
      />
    </RoleShell>
  );
}
