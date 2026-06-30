import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/teacher/attendance")({ component: Page });

type Section = { id: string; name: string; class_id: string; classes?: { name: string } | null };
type Student = { id: string; full_name: string; admission_no: string | null };
const STATUSES = ["present", "absent", "late", "leave"] as const;
type Status = (typeof STATUSES)[number];

function Page() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t) return;
      const { data } = await supabase
        .from("teacher_assignments")
        .select("section_id, sections(id, name, class_id, classes(name))")
        .eq("teacher_id", t.id);
      const secs = Array.from(
        new Map(
          (data ?? [])
            .map((r: any) => r.sections)
            .filter(Boolean)
            .map((s: any) => [s.id, s as Section]),
        ).values(),
      );
      setSections(secs);
      if (secs[0]) setSectionId(secs[0].id);
    })();
  }, [user]);

  async function load() {
    if (!sectionId) return;
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("id,full_name,admission_no")
      .eq("section_id", sectionId)
      .order("full_name");
    setStudents(data ?? []);
    const { data: existing } = await supabase
      .from("attendance")
      .select("student_id,status")
      .eq("date", date)
      .eq("section_id", sectionId);
    const m: Record<string, Status> = {};
    (existing ?? []).forEach((r: any) => { m[r.student_id] = r.status; });
    setMarks(m);
    setLoading(false);
  }

  useEffect(() => { if (sectionId) load(); /* eslint-disable-next-line */ }, [sectionId, date]);

  function markAll(s: Status) {
    const m: Record<string, Status> = {};
    students.forEach((st) => { m[st.id] = s; });
    setMarks(m);
  }

  async function save() {
    if (!sectionId) return;
    setSaving(true);
    const entries = students.filter((s) => marks[s.id]).map((s) => ({ student_id: s.id, status: marks[s.id] }));
    if (!entries.length) { setSaving(false); toast.error("Mark at least one student"); return; }
    const { error } = await supabase.rpc("mark_attendance_bulk", {
      _date: date, _section_id: sectionId, _entries: entries as never,
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success(`Saved ${entries.length} records`);
  }

  const summary = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
    students.forEach((s) => { const k = marks[s.id]; if (k) c[k]++; else c.unmarked++; });
    return c;
  }, [students, marks]);

  return (
    <>
      <PageHeader title="Mark Attendance" description="Bulk-update attendance for your assigned sections." />
      <div className="glass-card p-4 grid sm:grid-cols-4 gap-3 mb-4">
        <div>
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="Choose section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.classes?.name} · {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="sm:col-span-2 flex items-end gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => markAll("present")}>All Present</Button>
          <Button size="sm" variant="outline" onClick={() => markAll("absent")}>All Absent</Button>
          <Button size="sm" variant="ghost" onClick={() => setMarks({})}>Clear</Button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge variant="secondary">Present {summary.present}</Badge>
          <Badge variant="destructive">Absent {summary.absent}</Badge>
          <Badge variant="outline">Late {summary.late}</Badge>
          <Badge variant="outline">Leave {summary.leave}</Badge>
          <Badge variant="outline">Unmarked {summary.unmarked}</Badge>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No students in this section.</div>
        ) : (
          <>
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
                      <div className="inline-flex rounded-md border border-border overflow-hidden">
                        {STATUSES.map((st) => {
                          const active = marks[s.id] === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setMarks({ ...marks, [s.id]: st })}
                              className={`px-2.5 py-1 text-xs capitalize ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                            >{st}</button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-border flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Attendance"}</Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
