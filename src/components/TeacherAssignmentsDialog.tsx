import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { assignTeacher, unassignTeacher } from "@/lib/admin-users.functions";
import { toast } from "sonner";

type Teacher = { id: string; full_name: string };
type Row = {
  id: string;
  subject_id: string; class_id: string; section_id: string; session_id: string | null;
  subjects?: { name: string } | null;
  classes?: { name: string } | null;
  sections?: { name: string } | null;
  academic_sessions?: { name: string } | null;
};

export function TeacherAssignmentsDialog({ teacher, onOpenChange }: { teacher: Teacher; onOpenChange: (o: boolean) => void }) {
  const add = useServerFn(assignTeacher);
  const remove = useServerFn(unassignTeacher);

  const [rows, setRows] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ subject_id: "", class_id: "", section_id: "", session_id: "" });
  const [busy, setBusy] = useState(false);

  const filteredSections = useMemo(() => sections.filter((s) => s.class_id === form.class_id), [sections, form.class_id]);

  async function load() {
    const [{ data: r }, { data: sub }, { data: cls }, { data: sec }, { data: ses }] = await Promise.all([
      supabase.from("teacher_assignments")
        .select("id,subject_id,class_id,section_id,session_id,subjects(name),classes(name),sections(name),academic_sessions(name)")
        .eq("teacher_id", teacher.id),
      supabase.from("subjects").select("id,name").order("name"),
      supabase.from("classes").select("id,name").eq("status", "active").order("name"),
      supabase.from("sections").select("id,name,class_id").eq("status", "active").order("name"),
      supabase.from("academic_sessions").select("id,name").order("name"),
    ]);
    setRows((r ?? []) as any);
    setSubjects((sub ?? []) as any); setClasses((cls ?? []) as any);
    setSections((sec ?? []) as any); setSessions((ses ?? []) as any);
  }
  useEffect(() => { load(); }, [teacher.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.subject_id || !form.class_id || !form.section_id) return;
    setBusy(true);
    try {
      await add({ data: {
        teacher_id: teacher.id,
        subject_id: form.subject_id, class_id: form.class_id, section_id: form.section_id,
        session_id: form.session_id || null,
      } });
      toast.success("Assigned");
      setForm({ subject_id: "", class_id: "", section_id: "", session_id: "" });
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function del(id: string) {
    try { await remove({ data: { id } }); toast.success("Removed"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{teacher.full_name} — Assignments</DialogTitle></DialogHeader>

        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Class</th><th className="px-3 py-2">Section</th><th className="px-3 py-2">Session</th><th className="px-3 py-2 w-10"></th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.subjects?.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.classes?.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.sections?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.academic_sessions?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No assignments yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1.5"><Label className="text-xs">Subject</Label>
            <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Class</Label>
            <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Section</Label>
            <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })} disabled={!form.class_id}>
              <SelectTrigger><SelectValue placeholder={form.class_id ? "Section" : "Class first"} /></SelectTrigger>
              <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Session</Label>
            <Select value={form.session_id} onValueChange={(v) => setForm({ ...form, session_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy || !form.subject_id || !form.class_id || !form.section_id}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
