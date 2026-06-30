import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, CheckCircle2, X, Trash2, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exams")({ component: Page });

type Exam = { id: string; name: string; exam_date: string | null; class_id: string | null; exam_type: string; is_published: boolean; description: string | null };

function Page() {
  const [rows, setRows] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const empty = { name: "", exam_date: "", class_id: "", exam_type: "internal", description: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("exams").select("*").order("exam_date", { ascending: false, nullsFirst: false }),
      supabase.from("classes").select("id,name").order("name"),
    ]);
    setRows((e ?? []) as Exam[]); setClasses(c ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(x: Exam) {
    setEditing(x);
    setForm({ name: x.name, exam_date: x.exam_date ?? "", class_id: x.class_id ?? "", exam_type: x.exam_type, description: x.description ?? "" });
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const payload = {
      name: form.name, exam_date: form.exam_date || null, class_id: form.class_id || null,
      exam_type: form.exam_type, description: form.description || null, school_id: prof!.school_id,
    };
    if (editing) {
      const { error } = await supabase.from("exams").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("exams").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Created");
    }
    setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete exam and its results?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }
  async function togglePublish(x: Exam) {
    const { error } = await supabase.rpc("set_exam_published", { _exam_id: x.id, _published: !x.is_published });
    if (error) return toast.error(error.message);
    toast.success(x.is_published ? "Unpublished" : "Published"); load();
  }

  return (
    <>
      <PageHeader title="Exams & Results" description="Schedule exams, publish results, manage marks." actions={
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New exam</Button>
      } />
      <DataTable<Exam>
        rows={rows} loading={loading} filename="exams"
        searchKeys={["name"]} emptyTitle="No exams yet"
        columns={[
          { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "exam_type", label: "Type" },
          { key: "exam_date", label: "Date" },
          { key: "class_id", label: "Class", render: (r) => classes.find((c) => c.id === r.class_id)?.name ?? "All" },
          { key: "is_published", label: "Status", render: (r) => r.is_published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge> },
          { key: "actions", label: "", render: (r) => (
            <div className="flex gap-1 justify-end">
              <Button asChild size="sm" variant="ghost"><Link to="/admin/exams/$id" params={{ id: r.id }}><Eye className="h-4 w-4" /></Link></Button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant={r.is_published ? "secondary" : "outline"} onClick={() => togglePublish(r)}>
                {r.is_published ? <X className="h-4 w-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                {r.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit exam" : "New exam"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.exam_type} onValueChange={(v) => setForm({ ...form, exam_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="midterm">Mid-term</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="board">Board</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></div>
            </div>
            <div><Label>Class (optional)</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
