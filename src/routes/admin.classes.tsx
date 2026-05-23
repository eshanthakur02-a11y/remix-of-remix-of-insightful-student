import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/classes")({ component: Page });

function Page() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data ?? []));
  }, []);

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <div className="grid lg:grid-cols-2 gap-6">
        <CrudTable
          title="Classes"
          table="classes"
          columns={[{ key: "name", label: "Name" }]}
          fields={[{ key: "name", label: "Class name (e.g. Grade 5)", required: true }]}
        />
        <CrudTable
          title="Sections"
          table="sections"
          columns={[
            { key: "name", label: "Section" },
            { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "—" },
          ]}
          fields={[
            { key: "class_id", label: "Class", type: "select", required: true, options: classes.map((c) => ({ value: c.id, label: c.name })) },
            { key: "name", label: "Section (e.g. A)", required: true },
          ]}
        />
      </div>
    </RoleShell>
  );
}
