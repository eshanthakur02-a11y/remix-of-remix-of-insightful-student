import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Archive, Trash2, Pencil, ExternalLink } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { teacherNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { audit, notifyHomeworkAssigned, uploadHomeworkAttachment, type HwAttachment } from "@/lib/homework";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/homework")({ component: Page });

type Hw = {
  id: string; title: string; description: string | null; due_date: string | null;
  status: string; class_id: string | null; section_id: string | null; subject_id: string | null;
  school_id: string; attachments: HwAttachment[] | null; created_at: string;
};
type Opt = { id: string; name: string };
type Sec = Opt & { class_id: string };

function Page() {
  const [rows, setRows] = useState<Hw[]>([]);
  const [classes, setClasses] = useState<Opt[]>([]);
  const [sections, setSections] = useState<Sec[]>([]);
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Hw | null>(null);
  const [confirmDel, setConfirmDel] = useState<Hw | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterClass, setFilterClass] = useState<string>("all");

  const empty = { title: "", description: "", subject_id: "", class_id: "", section_id: "", due_date: "" };
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<File[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: hw }, { data: c }, { data: s }, { data: sub }] = await Promise.all([
      supabase.from("homework").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name").eq("status", "active").order("name"),
      supabase.from("sections").select("id,name,class_id").eq("status", "active").order("name"),
      supabase.from("subjects").select("id,name").order("name"),
    ]);
    setRows((hw ?? []) as Hw[]);
    setClasses((c ?? []) as Opt[]);
    setSections((s ?? []) as Sec[]);
    setSubjects((sub ?? []) as Opt[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filteredSections = useMemo(() => sections.filter((s) => s.class_id === form.class_id), [sections, form.class_id]);

  function startEdit(h: Hw) {
    setEditing(h);
    setForm({
      title: h.title, description: h.description ?? "", subject_id: h.subject_id ?? "",
      class_id: h.class_id ?? "", section_id: h.section_id ?? "", due_date: h.due_date ?? "",
    });
    setFiles([]);
    setOpen(true);
  }
  function startCreate() { setEditing(null); setForm(empty); setFiles([]); setOpen(true); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: prof } = await supabase.auth.getUser();
      const userId = prof.user?.id;
      const { data: me } = await supabase.from("profiles").select("school_id").eq("id", userId!).single();
      const school_id = me?.school_id ?? null;
      if (!school_id) throw new Error("Your account is not linked to a school");
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", userId!).maybeSingle();

      // upload attachments
      const uploaded: HwAttachment[] = [];
      for (const f of files) {
        const a = await uploadHomeworkAttachment("assignments", school_id, f);
        uploaded.push(a);
      }

      if (editing) {
        const merged = [...(editing.attachments ?? []), ...uploaded];
        const { error } = await supabase.from("homework").update({
          title: form.title, description: form.description || null,
          subject_id: form.subject_id || null, class_id: form.class_id || null,
          section_id: form.section_id || null, due_date: form.due_date || null,
          attachments: merged as never,
        }).eq("id", editing.id);
        if (error) throw error;
        await audit("homework.updated", editing.id, { title: form.title });
        toast.success("Homework updated");
      } else {
        const { data: ins, error } = await supabase.from("homework").insert({
          school_id, created_by: userId!, teacher_id: t?.id ?? null,
          title: form.title, description: form.description || null,
          subject_id: form.subject_id || null, class_id: form.class_id || null,
          section_id: form.section_id || null, due_date: form.due_date || null,
          attachments: uploaded as never,
        }).select("id").single();
        if (error) throw error;
        await notifyHomeworkAssigned(ins.id, form.section_id || null, form.title, school_id);
        toast.success("Homework assigned");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  async function archive(h: Hw) {
    const next = h.status === "archived" ? "active" : "archived";
    const { error } = await supabase.from("homework").update({ status: next }).eq("id", h.id);
    if (error) return toast.error(error.message);
    await audit(`homework.${next === "archived" ? "archived" : "unarchived"}`, h.id);
    toast.success(next === "archived" ? "Archived" : "Restored");
    load();
  }
  async function remove(h: Hw) {
    const { error } = await supabase.from("homework").delete().eq("id", h.id);
    if (error) return toast.error(error.message);
    await audit("homework.deleted", h.id, { title: h.title });
    toast.success("Deleted"); load();
  }

  const filtered = rows.filter((r) =>
    (filterStatus === "all" || r.status === filterStatus) &&
    (filterClass === "all" || r.class_id === filterClass)
  );

  return (
    <RoleShell role="teacher" navItems={teacherNav}>
      <PageHeader
        title="Homework"
        description="Create, track and grade homework you assign."
        actions={<Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New homework</Button>}
      />

      <DataTable<Hw>
        rows={filtered}
        loading={loading}
        filename="homework"
        searchKeys={["title", "description"]}
        emptyTitle="No homework yet"
        emptyDescription="Click 'New homework' to create your first assignment."
        toolbar={
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        columns={[
          { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "subject_id", label: "Subject", render: (r) => subjects.find((s) => s.id === r.subject_id)?.name ?? "—" },
          { key: "class_id", label: "Class", render: (r) => `${classes.find((c) => c.id === r.class_id)?.name ?? "—"} / ${sections.find((s) => s.id === r.section_id)?.name ?? "—"}` },
          { key: "due_date", label: "Due", render: (r) => r.due_date ?? "—" },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "archived" ? "secondary" : "default"}>{r.status}</Badge> },
          {
            key: "actions", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button asChild size="sm" variant="ghost"><Link to="/teacher/homework/$id" params={{ id: r.id }}><ExternalLink className="h-4 w-4" /></Link></Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(r)}><Archive className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit homework" : "New homework"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="md:col-span-2 space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Class</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Pick class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Section</Label>
              <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })} disabled={!form.class_id}>
                <SelectTrigger><SelectValue placeholder={form.class_id ? "Pick section" : "Pick class first"} /></SelectTrigger>
                <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Attachments</Label>
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {editing?.attachments?.length ? (
                <p className="text-xs text-muted-foreground">{editing.attachments.length} existing file(s) — new ones will be appended.</p>
              ) : null}
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Update" : "Assign"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete homework?" description={confirmDel?.title}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => confirmDel && remove(confirmDel)}
      />
    </RoleShell>
  );
}
