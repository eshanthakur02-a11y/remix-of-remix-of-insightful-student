import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/teacher/attendance")({ component: Page });

type Student = { id: string; full_name: string; admission_no: string | null; class_id: string | null; section_id: string | null };

function Page() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id,name").then(({ data }) => setClasses(data ?? []));
    supabase.from("sections").select("id,name,class_id").then(({ data }) => setSections(data ?? []));
  }, []);

  async function loadStudents() {
    if (!classId) return;
    let q = supabase.from("students").select("id,full_name,admission_no,class_id,section_id").eq("class_id", classId);
    if (sectionId) q = q.eq("section_id", sectionId);
    const { data } = await q;
    setStudents(data ?? []);
    const { data: existing } = await supabase.from("attendance").select("student_id,status").eq("date", date).in("student_id", (data ?? []).map((s) => s.id));
    const m: Record<string, string> = {};
    (existing ?? []).forEach((r) => { m[r.student_id] = r.status; });
    setMarks(m);
  }

  async function save() {
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const rows = students.filter((s) => marks[s.id]).map((s) => ({
      student_id: s.id, date, status: marks[s.id], marked_by: user?.id,
    }));
    if (rows.length === 0) { setSaving(false); toast.error("Mark at least one student"); return; }
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Attendance saved");
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Mark Attendance</h1>
      <div className="glass-card p-4 grid sm:grid-cols-4 gap-3 mb-4">
        <div><Label>Class</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><Label>Section</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All</option>{sections.filter((s) => s.class_id === classId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={loadStudents} className="w-full">Load Students</Button></div>
      </div>
      {students.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Adm #</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Status</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2">{s.admission_no ?? "—"}</td>
                  <td className="px-4 py-2">{s.full_name}</td>
                  <td className="px-4 py-2">
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={marks[s.id] ?? ""} onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}>
                      <option value="">—</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="leave">Leave</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border flex justify-end">
            <Button onClick={save} disabled={saving}>Save Attendance</Button>
          </div>
        </div>
      )}
    </>
  );
}
