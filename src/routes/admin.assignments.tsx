import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/assignments")({ component: Page });

function Page() {
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  useEffect(() => {
    supabase.from("teachers").select("id,full_name").order("full_name").then(({ data }) => setTeachers(data ?? []));
    supabase.from("subjects").select("id,name").order("name").then(({ data }) => setSubjects(data ?? []));
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data ?? []));
    supabase.from("sections").select("id,name,class_id").then(({ data }) => setSections(data ?? []));
  }, []);

  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <CrudTable
        title="Teacher Assignments"
        table="teacher_subjects"
        columns={[
          { key: "teacher_id", label: "Teacher", render: (r: { teacher_id: string }) => teachers.find((t) => t.id === r.teacher_id)?.full_name ?? "—" },
          { key: "subject_id", label: "Subject", render: (r: { subject_id: string }) => subjects.find((s) => s.id === r.subject_id)?.name ?? "—" },
          { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "—" },
          { key: "section_id", label: "Section", render: (r: { section_id: string }) => sections.find((s) => s.id === r.section_id)?.name ?? "—" },
        ]}
        fields={[
          { key: "teacher_id", label: "Teacher", type: "select", required: true, options: teachers.map((t) => ({ value: t.id, label: t.full_name })) },
          { key: "subject_id", label: "Subject", type: "select", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
          { key: "class_id", label: "Class", type: "select", options: classes.map((c) => ({ value: c.id, label: c.name })) },
          { key: "section_id", label: "Section", type: "select", options: sections.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />
    </RoleShell>
  );
}
