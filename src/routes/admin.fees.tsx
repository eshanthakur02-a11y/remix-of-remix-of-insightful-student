import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/fees")({ component: Page });

function Page() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { supabase.from("classes").select("id,name").then(({ data }) => setClasses(data ?? [])); }, []);

  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <CrudTable
        title="Fee Structure"
        table="fees"
        columns={[
          { key: "title", label: "Title" },
          { key: "amount", label: "Amount" },
          { key: "due_date", label: "Due" },
          { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "All" },
        ]}
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "amount", label: "Amount", type: "number", required: true },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "class_id", label: "Class", type: "select", options: classes.map((c) => ({ value: c.id, label: c.name })) },
        ]}
      />
    </RoleShell>
  );
}
