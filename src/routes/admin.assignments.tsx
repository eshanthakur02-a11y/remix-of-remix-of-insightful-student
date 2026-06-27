import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TeacherAssignmentsDialog } from "@/components/TeacherAssignmentsDialog";

export const Route = createFileRoute("/admin/assignments")({ component: Page });

type Teacher = { id: string; full_name: string };
type Row = {
  id: string; teacher_id: string;
  teachers?: { full_name: string } | null;
  subjects?: { name: string } | null;
  classes?: { name: string } | null;
  sections?: { name: string } | null;
  academic_sessions?: { name: string } | null;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [active, setActive] = useState<Teacher | null>(null);

  async function load() {
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("teacher_assignments")
        .select("id,teacher_id,teachers(full_name),subjects(name),classes(name),sections(name),academic_sessions(name)")
        .order("created_at", { ascending: false }),
      supabase.from("teachers").select("id,full_name").order("full_name"),
    ]);
    setRows((r ?? []) as any);
    setTeachers((t ?? []) as Teacher[]);
  }
  useEffect(() => { load(); }, []);

  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Teacher Assignments</h1>
          <p className="text-sm text-muted-foreground">Who teaches which subject in which class/section.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {teachers.map((t) => (
          <Button key={t.id} size="sm" variant="outline" onClick={() => setActive(t)}>
            <UserCog className="h-3.5 w-3.5 mr-1" /> {t.full_name}
          </Button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2">Teacher</th><th className="px-4 py-2">Subject</th><th className="px-4 py-2">Class</th><th className="px-4 py-2">Section</th><th className="px-4 py-2">Session</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.teachers?.full_name ?? "—"}</td>
                <td className="px-4 py-2">{r.subjects?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.classes?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.sections?.name ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.academic_sessions?.name ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No assignments yet. Pick a teacher above to add some.</td></tr>}
          </tbody>
        </table>
      </div>

      {active && <TeacherAssignmentsDialog teacher={active} onOpenChange={(o) => { if (!o) { setActive(null); load(); } }} />}
    </RoleShell>
  );
}
