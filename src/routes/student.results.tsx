import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/results")({ component: Page });

type Row = {
  id: string;
  marks_obtained: number | null;
  max_marks: number | null;
  grade: string | null;
  exams?: { id: string; name: string; is_published: boolean } | null;
  subjects?: { name: string } | null;
};

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [student, setStudent] = useState<{ full_name: string; admission_no: string | null; classes?: { name: string } | null; sections?: { name: string } | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase
        .from("students")
        .select("id,full_name,admission_no,classes(name),sections(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!s) return;
      setStudent(s as never);
      const { data } = await supabase
        .from("exam_results")
        .select("id,marks_obtained,max_marks,grade,exams!inner(id,name,is_published),subjects(name)")
        .eq("student_id", s.id)
        .eq("exams.is_published", true);
      setRows((data as never) ?? []);
    })();
  }, [user]);

  const byExam = useMemo(() => {
    const m = new Map<string, { name: string; rows: Row[] }>();
    rows.forEach((r) => {
      const id = r.exams?.id ?? "—";
      if (!m.has(id)) m.set(id, { name: r.exams?.name ?? "—", rows: [] });
      m.get(id)!.rows.push(r);
    });
    return Array.from(m.values());
  }, [rows]);

  return (
    <>
      <PageHeader
        title="My Results"
        description="Published exam results across all subjects."
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print Report Card</Button>}
      />

      <div id="report-card" className="space-y-5">
        <section className="glass-card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{student?.full_name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              Adm. {student?.admission_no ?? "—"} · {student?.classes?.name ?? "—"} {student?.sections?.name ?? ""}
            </div>
          </div>
          <Badge variant="secondary">{byExam.length} exam{byExam.length === 1 ? "" : "s"}</Badge>
        </section>

        {byExam.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">No published results yet.</div>
        ) : byExam.map((ex) => {
          const total = ex.rows.reduce((a, r) => a + Number(r.marks_obtained ?? 0), 0);
          const max = ex.rows.reduce((a, r) => a + Number(r.max_marks ?? 0), 0);
          const pct = max > 0 ? (total / max) * 100 : 0;
          return (
            <section key={ex.name} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">{ex.name}</h3>
                <div className="text-sm">
                  <span className="text-muted-foreground mr-2">Total</span>
                  <b>{total}/{max}</b> <span className="text-muted-foreground">· {pct.toFixed(1)}%</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Subject</th>
                    <th className="text-left px-4 py-2">Marks</th>
                    <th className="text-left px-4 py-2">%</th>
                    <th className="text-left px-4 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.rows.map((r) => {
                    const p = r.max_marks ? ((Number(r.marks_obtained ?? 0) / Number(r.max_marks)) * 100).toFixed(1) : "—";
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-2">{r.subjects?.name ?? "—"}</td>
                        <td className="px-4 py-2">{r.marks_obtained ?? 0} / {r.max_marks ?? 0}</td>
                        <td className="px-4 py-2">{p}{typeof p === "string" && p !== "—" ? "%" : ""}</td>
                        <td className="px-4 py-2">{r.grade ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </>
  );
}
