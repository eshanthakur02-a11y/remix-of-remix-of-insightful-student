import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/timetable")({ component: Page });

const DAYS = [
  { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" }, { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" }, { value: "5", label: "Friday" }, { value: "6", label: "Saturday" }, { value: "7", label: "Sunday" },
];

function Page() {
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("teachers").select("id,full_name").then(({ data }) => setTeachers(data ?? []));
    supabase.from("subjects").select("id,name").then(({ data }) => setSubjects(data ?? []));
    supabase.from("classes").select("id,name").then(({ data }) => setClasses(data ?? []));
    supabase.from("sections").select("id,name").then(({ data }) => setSections(data ?? []));
  }, []);

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <CrudTable
        title="Timetable"
        table="timetable"
        columns={[
          { key: "day_of_week", label: "Day", render: (r: { day_of_week: number }) => DAYS[r.day_of_week - 1]?.label },
          { key: "start_time", label: "Start" },
          { key: "end_time", label: "End" },
          { key: "class_id", label: "Class", render: (r: { class_id: string }) => classes.find((c) => c.id === r.class_id)?.name ?? "—" },
          { key: "section_id", label: "Section", render: (r: { section_id: string }) => sections.find((s) => s.id === r.section_id)?.name ?? "—" },
          { key: "subject_id", label: "Subject", render: (r: { subject_id: string }) => subjects.find((s) => s.id === r.subject_id)?.name ?? "—" },
          { key: "teacher_id", label: "Teacher", render: (r: { teacher_id: string }) => teachers.find((t) => t.id === r.teacher_id)?.full_name ?? "—" },
        ]}
        fields={[
          { key: "class_id", label: "Class", type: "select", required: true, options: classes.map((c) => ({ value: c.id, label: c.name })) },
          { key: "section_id", label: "Section", type: "select", options: sections.map((s) => ({ value: s.id, label: s.name })) },
          { key: "subject_id", label: "Subject", type: "select", options: subjects.map((s) => ({ value: s.id, label: s.name })) },
          { key: "teacher_id", label: "Teacher", type: "select", options: teachers.map((t) => ({ value: t.id, label: t.full_name })) },
          { key: "day_of_week", label: "Day", type: "select", required: true, options: DAYS },
          { key: "start_time", label: "Start time", type: "time", required: true },
          { key: "end_time", label: "End time", type: "time", required: true },
        ]}
      />
    </RoleShell>
  );
}
