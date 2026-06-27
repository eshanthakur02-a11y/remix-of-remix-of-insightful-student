import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { teacherNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { audit, getSignedUrl, type HwAttachment } from "@/lib/homework";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/homework/$id")({ component: Page });

type Hw = { id: string; title: string; description: string | null; due_date: string | null; section_id: string | null; school_id: string; attachments: HwAttachment[] | null };
type Sub = { id: string; student_id: string; submitted_at: string; status: string; note: string | null; marks: number | null; grade: string | null; feedback: string | null; attachments: HwAttachment[] | null };
type Student = { id: string; full_name: string; admission_no: string | null; user_id: string | null };

function Page() {
  const { id } = Route.useParams();
  const [hw, setHw] = useState<Hw | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [edit, setEdit] = useState<Record<string, { marks: string; grade: string; feedback: string }>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: h } = await supabase.from("homework").select("*").eq("id", id).single();
    setHw(h as Hw);
    if (h?.section_id) {
      const { data: st } = await supabase.from("students").select("id,full_name,admission_no,user_id").eq("section_id", h.section_id).order("admission_no");
      setStudents((st ?? []) as Student[]);
    }
    const { data: s } = await supabase.from("homework_submissions").select("*").eq("homework_id", id);
    const map: Record<string, Sub> = {};
    const ed: Record<string, { marks: string; grade: string; feedback: string }> = {};
    (s ?? []).forEach((row) => {
      map[row.student_id] = row as Sub;
      ed[row.student_id] = { marks: row.marks?.toString() ?? "", grade: row.grade ?? "", feedback: row.feedback ?? "" };
    });
    setSubs(map); setEdit(ed);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function grade(student_id: string) {
    const sub = subs[student_id]; if (!sub) return;
    const e = edit[student_id];
    const { error } = await supabase.from("homework_submissions").update({
      marks: e.marks ? Number(e.marks) : null, grade: e.grade || null, feedback: e.feedback || null, status: "graded",
    }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    await audit("homework.graded", id, { student_id });
    if (sub && hw) {
      const { data: st } = await supabase.from("students").select("user_id").eq("id", student_id).single();
      if (st?.user_id) {
        await supabase.rpc("create_notification", {
          _user_id: st.user_id, _kind: "homework", _title: "Homework graded",
          _body: hw.title, _school_id: hw.school_id ?? undefined,
        });
      }
    }
    toast.success("Graded"); load();
  }

  async function openFile(p: HwAttachment) {
    window.open(await getSignedUrl("assignments", p.path), "_blank");
  }

  const submitted = students.filter((s) => subs[s.id]).length;

  return (
    <RoleShell role="teacher" navItems={teacherNav}>
      <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/teacher/homework"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      <PageHeader title={hw?.title ?? "Homework"} description={hw?.description ?? undefined} />

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Class size</div><div className="text-2xl font-semibold">{students.length}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Submitted</div><div className="text-2xl font-semibold">{submitted}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-semibold">{students.length - submitted}</div></div>
      </div>

      {hw?.attachments?.length ? (
        <div className="glass-card p-3 mb-4 flex flex-wrap gap-2">
          {hw.attachments.map((a) => (
            <Button key={a.path} size="sm" variant="outline" onClick={() => openFile(a)}><Download className="h-3 w-3 mr-1" />{a.name}</Button>
          ))}
        </div>
      ) : null}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Files</th>
              <th className="text-left px-4 py-3">Marks</th>
              <th className="text-left px-4 py-3">Grade</th>
              <th className="text-left px-4 py-3">Feedback</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              : students.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No students in this section.</td></tr>
              : students.map((s) => {
                const sub = subs[s.id];
                const e = edit[s.id] ?? { marks: "", grade: "", feedback: "" };
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2"><div className="font-medium">{s.full_name}</div><div className="text-xs text-muted-foreground font-mono">{s.admission_no}</div></td>
                    <td className="px-4 py-2"><Badge variant={sub ? (sub.status === "graded" ? "default" : "secondary") : "outline"}>{sub?.status ?? "pending"}</Badge></td>
                    <td className="px-4 py-2">{sub?.attachments?.length ? sub.attachments.map((a) => <Button key={a.path} size="sm" variant="ghost" onClick={() => openFile(a)}><Download className="h-3 w-3" /></Button>) : "—"}</td>
                    <td className="px-4 py-2"><Input className="w-20" type="number" value={e.marks} disabled={!sub} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, marks: ev.target.value } })} /></td>
                    <td className="px-4 py-2"><Input className="w-16" value={e.grade} disabled={!sub} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, grade: ev.target.value } })} /></td>
                    <td className="px-4 py-2"><Textarea rows={1} value={e.feedback} disabled={!sub} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, feedback: ev.target.value } })} /></td>
                    <td className="px-4 py-2"><Button size="sm" disabled={!sub} onClick={() => grade(s.id)}>Save</Button></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </RoleShell>
  );
}
