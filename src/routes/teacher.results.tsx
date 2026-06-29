import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/teacher/results")({ component: Page });

function Page() {
  const [exams, setExams] = useState<{ id: string; name: string; class_id: string | null }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [examId, setExamId] = useState(""); const [subjectId, setSubjectId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [maxMarks, setMaxMarks] = useState("100");

  useEffect(() => {
    supabase.from("exams").select("id,name,class_id").then(({ data }) => setExams(data ?? []));
    supabase.from("subjects").select("id,name").then(({ data }) => setSubjects(data ?? []));
  }, []);

  async function load() {
    const exam = exams.find((e) => e.id === examId);
    if (!exam || !subjectId) return;
    let q = supabase.from("students").select("id,full_name");
    if (exam.class_id) q = q.eq("class_id", exam.class_id);
    const { data } = await q;
    setStudents(data ?? []);
    const { data: existing } = await supabase.from("exam_results").select("student_id,marks").eq("exam_id", examId).eq("subject_id", subjectId);
    const m: Record<string, string> = {};
    (existing ?? []).forEach((r) => { m[r.student_id] = String(r.marks); });
    setMarks(m);
  }

  async function save() {
    const rows = students.filter((s) => marks[s.id] !== undefined && marks[s.id] !== "").map((s) => ({
      exam_id: examId, subject_id: subjectId, student_id: s.id, marks: Number(marks[s.id]), max_marks: Number(maxMarks),
    }));
    const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "exam_id,student_id,subject_id" });
    if (error) toast.error(error.message); else toast.success("Results saved");
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Enter Exam Results</h1>
      <div className="glass-card p-4 grid sm:grid-cols-4 gap-3 mb-4">
        <div><Label>Exam</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">Select</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div><Label>Subject</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><Label>Max Marks</Label><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={load} className="w-full">Load</Button></div>
      </div>
      {students.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Marks</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2">{s.full_name}</td>
                  <td className="px-4 py-2"><Input type="number" className="w-24" value={marks[s.id] ?? ""} onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border flex justify-end"><Button onClick={save}>Save Results</Button></div>
        </div>
      )}
    </>
  );
}
