import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Plus } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CredentialsModal, type Cred } from "@/components/CredentialsModal";
import { supabase } from "@/integrations/supabase/client";
import { createStudentWithParent, resetStudentPassword } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/students")({ component: Page });

type Cls = { id: string; name: string; status: string };
type Sec = { id: string; name: string; class_id: string; status: string };
type Student = { id: string; admission_no: string; full_name: string; class_id: string | null; section_id: string | null; user_id: string | null };

function Page() {
  const createSWP = useServerFn(createStudentWithParent);
  const resetPw = useServerFn(resetStudentPassword);

  const [classes, setClasses] = useState<Cls[]>([]);
  const [sections, setSections] = useState<Sec[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const emptyForm = {
    student_full_name: "", admission_no: "",
    class_id: "", section_id: "",
    parent_full_name: "", parent_email: "", parent_phone: "", relationship: "",
  };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const [{ data: c }, { data: s }, { data: st }] = await Promise.all([
      supabase.from("classes").select("id,name,status").eq("status", "active").order("name"),
      supabase.from("sections").select("id,name,class_id,status").eq("status", "active").order("name"),
      supabase.from("students").select("id,admission_no,full_name,class_id,section_id,user_id").order("admission_no"),
    ]);
    setClasses((c ?? []) as Cls[]);
    setSections((s ?? []) as Sec[]);
    setStudents((st ?? []) as Student[]);
  }
  useEffect(() => { load(); }, []);

  // Cascading sections
  const filteredSections = useMemo(
    () => sections.filter((s) => s.class_id === form.class_id),
    [sections, form.class_id],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createSWP({ data: {
        student_full_name: form.student_full_name,
        admission_no: form.admission_no,
        class_id: form.class_id || null,
        section_id: form.section_id || null,
        parent_full_name: form.parent_full_name,
        parent_email: form.parent_email,
        parent_phone: form.parent_phone || null,
        relationship: form.relationship || null,
      } });
      toast.success("Student created · parent invited");
      setOpen(false);
      setForm(emptyForm);
      if (res.studentLoginEnabled && res.studentLoginEmail && res.studentTempPassword) {
        setCreds([
          { label: "Student login email", value: res.studentLoginEmail },
          { label: "Temporary password", value: res.studentTempPassword },
        ]);
      }
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create student");
    } finally { setBusy(false); }
  }

  async function reset(id: string) {
    try {
      const r = await resetPw({ data: { student_id: id } });
      setCreds([{ label: "New temporary password", value: r.tempPassword }]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">Students are created with a linked parent account.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New student</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Enroll a student</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Student full name *</Label><Input required value={form.student_full_name} onChange={(e) => setForm({ ...form, student_full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Admission # *</Label><Input required value={form.admission_no} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })} disabled={!form.class_id}>
                  <SelectTrigger><SelectValue placeholder={form.class_id ? (filteredSections.length ? "Pick a section" : "No sections in this class") : "Pick a class first"} /></SelectTrigger>
                  <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">Parent / guardian</div>
              <div className="space-y-1.5"><Label>Parent name *</Label><Input required value={form.parent_full_name} onChange={(e) => setForm({ ...form, parent_full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Parent email *</Label><Input type="email" required value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Relationship</Label><Input placeholder="Father / Mother / Guardian" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Adm #</th><th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Class</th><th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Login</th><th className="px-4 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-mono text-xs">{s.admission_no}</td>
                <td className="px-4 py-2">{s.full_name}</td>
                <td className="px-4 py-2">{classes.find((c) => c.id === s.class_id)?.name ?? "—"}</td>
                <td className="px-4 py-2">{sections.find((x) => x.id === s.section_id)?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.user_id ? "Enabled" : "Disabled"}</td>
                <td className="px-4 py-2 text-right">
                  {s.user_id && (
                    <Button size="sm" variant="ghost" onClick={() => reset(s.id)}><KeyRound className="h-4 w-4 mr-1" /> Reset</Button>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No students yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <CredentialsModal open={!!creds} onOpenChange={(o) => !o && setCreds(null)} creds={creds ?? []} />
    </RoleShell>
  );
}
