import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { studentNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/results")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; marks: number; max_marks: number; exams?: { name: string } | null; subjects?: { name: string } | null }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!s) return;
      const { data } = await supabase.from("exam_results").select("id,marks,max_marks,exams(name),subjects(name)").eq("student_id", s.id);
      setRows((data as never) ?? []);
    })();
  }, [user]);

  return (
    <RoleShell role="student" navItems={studentNav}>
      <h1 className="text-2xl font-semibold mb-4">My Results</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Exam</th><th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">Marks</th><th className="text-left px-4 py-3">%</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No results yet.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">{r.exams?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.subjects?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.marks} / {r.max_marks}</td>
                <td className="px-4 py-2">{((r.marks / r.max_marks) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RoleShell>
  );
}
