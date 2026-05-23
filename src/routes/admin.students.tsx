import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/students")({ component: Page });

function Page() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data ?? []));
    supabase.from("sections").select("id,name,class_id").order("name").then(({ data }) => setSections(data ?? []));
  }, []);

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <CrudTable
        title="Students"
        table="students"
        columns={[
          { key: "admission_no", label: "Adm #" },
          { key: "full_name", label: "Name" },
          { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "—" },
          { key: "section_id", label: "Section", render: (r: { section_id: string }) => sections.find((s) => s.id === r.section_id)?.name ?? "—" },
          { key: "parent_phone", label: "Parent phone" },
        ]}
        fields={[
          { key: "admission_no", label: "Admission number" },
          { key: "full_name", label: "Full name", required: true },
          { key: "class_id", label: "Class", type: "select", options: classes.map((c) => ({ value: c.id, label: c.name })) },
          { key: "section_id", label: "Section", type: "select", options: sections.map((s) => ({ value: s.id, label: `${classes.find((c) => c.id === s.class_id)?.name ?? "?"} - ${s.name}` })) },
          { key: "parent_name", label: "Parent name" },
          { key: "parent_phone", label: "Parent phone" },
          { key: "address", label: "Address" },
        ]}
      />
    </RoleShell>
  );
}
