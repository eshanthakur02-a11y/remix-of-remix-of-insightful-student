import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/homework")({ component: Page });

type Hw = { id: string; title: string; description: string | null; status: string; due_date: string | null; class_id: string | null; section_id: string | null; subject_id: string | null };

function Page() {
  const [rows, setRows] = useState<Hw[]>([]);
  const [counts, setCounts] = useState<Record<string, { submitted: number; total: number }>>({});
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hw | null>(null);
  const empty = { title: "", description: "", subject_id: "", class_id: "", section_id: "", due_date: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: hw }, { data: c }, { data: s }, { data: sub }] = await Promise.all([
      supabase.from("homework").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name").eq("status", "active").order("name"),
      supabase.from("sections").select("id,name,class_id").eq("status", "active"),
      supabase.from("subjects").select("id,name").order("name"),
    ]);
    const list = (hw ?? []) as Hw[];
    setRows(list); setClasses(c ?? []); setSections(s ?? []); setSubjects(sub ?? []);

    const ids = list.map((h) => h.id);
    if (ids.length) {
      const { data: subRows } = await supabase.from("homework_submissions").select("homework_id").in("homework_id", ids);
      const subCount: Record<string, number> = {};
      (subRows ?? []).forEach((r) => { subCount[r.homework_id] = (subCount[r.homework_id] ?? 0) + 1; });
      const map: Record<string, { submitted: number; total: number }> = {};
      for (const h of list) {
        let total = 0;
        if (h.section_id) {
          const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("section_id", h.section_id);
          total = count ?? 0;
        }
        map[h.id] = { submitted: subCount[h.id] ?? 0, total };
      }
      setCounts(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(h: Hw) {
    setEditing(h);
    setForm({
      title: h.title, description: h.description ?? "", subject_id: h.subject_id ?? "",
      class_id: h.class_id ?? "", section_id: h.section_id ?? "", due_date: h.due_date ?? "",
    });
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const payload = {
      title: form.title, description: form.description || null,
      subject_id: form.subject_id || null, class_id: form.class_id || null,
      section_id: form.section_id || null, due_date: form.due_date || null,
    };
    if (editing) {
      const { error } = await supabase.from("homework").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("homework").insert({ ...payload, school_id: prof!.school_id!, created_by: me.user!.id });
      if (error) return toast.error(error.message);
      toast.success("Created");
    }
    setOpen(false); load();
  }

  async function archive(h: Hw) {
    const status = h.status === "archived" ? "active" : "archived";
    const { error } = await supabase.from("homework").update({ status }).eq("id", h.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(h: Hw) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("homework").delete().eq("id", h.id);
    if (error) return toast.error(error.message);
    load();
  }

  const totalSubmitted = Object.values(counts).reduce((a, b) => a + b.submitted, 0);
  const totalExpected = Object.values(counts).reduce((a, b) => a + b.total, 0);
  const active = rows.filter((r) => r.status === "active").length;

  return (
    <>
      <PageHeader title="Homework" description="Manage homework across all classes." actions={
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New homework</Button>
      } />
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-semibold">{active}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Submissions</div><div className="text-2xl font-semibold">{totalSubmitted}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Rate</div><div className="text-2xl font-semibold">{totalExpected ? Math.round((totalSubmitted / totalExpected) * 100) : 0}%</div></div>
      </div>
      <DataTable<Hw>
        rows={rows} loading={loading} filename="homework"
        searchKeys={["title"]} emptyTitle="No homework yet"
        columns={[
          { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "subject_id", label: "Subject", render: (r) => subjects.find((s) => s.id === r.subject_id)?.name ?? "—" },
          { key: "class_id", label: "Class/Section", render: (r) => `${classes.find((c) => c.id === r.class_id)?.name ?? "—"} / ${sections.find((s) => s.id === r.section_id)?.name ?? "—"}` },
          { key: "due_date", label: "Due", render: (r) => r.due_date ?? "—" },
          { key: "submissions", label: "Subs", render: (r) => `${counts[r.id]?.submitted ?? 0} / ${counts[r.id]?.total ?? 0}` },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "archived" ? "secondary" : "default"}>{r.status}</Badge> },
          { key: "actions", label: "", render: (r) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.status === "archived" ? "Restore" : "Archive"}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit homework" : "New homework"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Class</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: "" })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label>
              <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })} disabled={!form.class_id}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{sections.filter((s) => s.class_id === form.class_id).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
