import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exams/$id")({ component: Page });

type Subject = { id: string; name: string };
type Student = { id: string; full_name: string; admission_no: string | null };

function Page() {
  const { id } = useParams({ from: "/admin/exams/$id" });
  const [exam, setExam] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [allResults, setAllResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("exams").select("*,classes(name)").eq("id", id).single();
      setExam(e);
      const { data: subs } = await supabase.from("subjects").select("id,name").order("name");
      setSubjects(subs ?? []);
      let q = supabase.from("students").select("id,full_name,admission_no").order("full_name");
      if (e?.class_id) q = q.eq("class_id", e.class_id);
      const { data: st } = await q;
      setStudents((st ?? []) as Student[]);
      loadAll();
    })();
    // eslint-disable-next-line
  }, [id]);

  async function loadMarks() {
    if (!subjectId) return;
    const { data } = await supabase.from("exam_results").select("student_id,marks,max_marks").eq("exam_id", id).eq("subject_id", subjectId);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r) => { m[r.student_id] = String(r.marks); });
    setMarks(m);
    if (data?.[0]) setMaxMarks(String(data[0].max_marks));
  }
  useEffect(() => { loadMarks(); /* eslint-disable-next-line */ }, [subjectId]);

  async function save() {
    if (!subjectId) return toast.error("Pick a subject");
    const rows = students.filter((s) => marks[s.id] !== undefined && marks[s.id] !== "").map((s) => {
      const m = Number(marks[s.id]);
      const mx = Number(maxMarks);
      if (m < 0 || m > mx) throw new Error(`Invalid marks for ${s.full_name}`);
      return { exam_id: id, subject_id: subjectId, student_id: s.id, marks: m, max_marks: mx };
    });
    const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "exam_id,student_id,subject_id" });
    if (error) return toast.error(error.message);
    toast.success(`Saved ${rows.length} results`); loadAll();
  }

  async function loadAll() {
    const { data } = await supabase.from("exam_results").select("marks,max_marks,students(id,full_name),subjects(id,name)").eq("exam_id", id);
    setAllResults(data ?? []);
  }

  const analytics = useMemo(() => {
    const byStudent: Record<string, { name: string; total: number; max: number }> = {};
    const bySubject: Record<string, { name: string; total: number; max: number; n: number }> = {};
    allResults.forEach((r: any) => {
      const sid = r.students?.id ?? ""; const sname = r.students?.full_name ?? "";
      byStudent[sid] = byStudent[sid] ?? { name: sname, total: 0, max: 0 };
      byStudent[sid].total += Number(r.marks); byStudent[sid].max += Number(r.max_marks);
      const subId = r.subjects?.id ?? ""; const subName = r.subjects?.name ?? "";
      bySubject[subId] = bySubject[subId] ?? { name: subName, total: 0, max: 0, n: 0 };
      bySubject[subId].total += Number(r.marks); bySubject[subId].max += Number(r.max_marks); bySubject[subId].n++;
    });
    const ranking = Object.values(byStudent).map((s) => ({ ...s, pct: s.max ? Math.round((s.total / s.max) * 100) : 0 })).sort((a, b) => b.pct - a.pct);
    const subjectAvg = Object.values(bySubject).map((s) => ({ name: s.name, avg: s.n ? Math.round((s.total / s.max) * 100) : 0 }));
    return { ranking, subjectAvg };
  }, [allResults]);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/admin/exams"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      <PageHeader title={exam?.name ?? "Exam"} description={`${exam?.exam_type ?? ""} • ${exam?.classes?.name ?? "All classes"} • ${exam?.exam_date ?? "No date"}`}
        actions={exam?.is_published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>} />

      <Tabs defaultValue="enter">
        <TabsList>
          <TabsTrigger value="enter">Enter marks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Ranks</TabsTrigger>
        </TabsList>

        <TabsContent value="enter" className="space-y-3">
          <div className="glass-card p-4 grid sm:grid-cols-4 gap-3">
            <div><Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Max marks</Label><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></div>
            <div className="flex items-end col-span-2"><Button onClick={save} className="ml-auto"><Save className="h-4 w-4 mr-1" /> Save marks</Button></div>
          </div>
          {subjectId && (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Adm</th><th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3 w-32">Marks</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{s.admission_no ?? "—"}</td>
                      <td className="px-4 py-2">{s.full_name}</td>
                      <td className="px-4 py-2"><Input type="number" min={0} max={Number(maxMarks)} value={marks[s.id] ?? ""} onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2"><Trophy className="h-4 w-4" /> Top performers</h3>
              <ol className="space-y-1.5 text-sm">
                {analytics.ranking.slice(0, 15).map((r, i) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1">{r.name}</span>
                    <Badge variant="secondary">{r.pct}%</Badge>
                  </li>
                ))}
                {analytics.ranking.length === 0 && <div className="text-muted-foreground text-xs">No results yet.</div>}
              </ol>
            </div>
            <div className="glass-card p-4">
              <h3 className="font-medium mb-3">Subject averages</h3>
              <div className="space-y-2">
                {analytics.subjectAvg.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{s.name}</div>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${s.avg}%` }} /></div>
                    <div className="w-12 text-right text-sm tabular-nums">{s.avg}%</div>
                  </div>
                ))}
                {analytics.subjectAvg.length === 0 && <div className="text-muted-foreground text-xs">No results yet.</div>}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
