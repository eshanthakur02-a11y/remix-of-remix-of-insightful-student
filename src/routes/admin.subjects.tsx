import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore, BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
  createSubject, updateSubject, setSubjectStatus, deleteSubjectSafe,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/subjects")({ component: Page });

type Subject = { id: string; name: string; code: string | null; status: string };

function Page() {
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });

  const create = useServerFn(createSubject);
  const update = useServerFn(updateSubject);
  const setStatus = useServerFn(setSubjectStatus);
  const del = useServerFn(deleteSubjectSafe);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects").select("id,name,code,status").order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Subject[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((s) => showArchived || s.status === "active")
      .filter((s) => !term || s.name.toLowerCase().includes(term) || (s.code ?? "").toLowerCase().includes(term));
  }, [items, q, showArchived]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "" });
    setEditOpen(true);
  }
  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ name: s.name, code: s.code ?? "" });
    setEditOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error("Name is required");
    setBusy(true);
    try {
      if (editing) {
        await update({ data: { id: editing.id, name, code: form.code.trim() || null } });
        toast.success("Subject updated");
      } else {
        await create({ data: { name, code: form.code.trim() || null } });
        toast.success("Subject created");
      }
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function run<T>(p: Promise<T>, ok: string) {
    try { await p; toast.success(ok); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Manage the subjects taught in your school.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> New subject</Button>
        </div>
      </div>

      <section className="glass-card p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name or code…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={q ? "No subjects match your search" : "No subjects yet"}
              description={q ? "Try a different name or code." : "Create your first subject to get started."}
              action={!q ? <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> New subject</Button> : null}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 px-2">Name</th><th className="py-2 px-2">Code</th><th className="py-2 px-2">Status</th><th className="py-2 px-2 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border/60">
                    <td className="py-2 px-2">
                      <span className={s.status === "archived" ? "text-muted-foreground line-through" : ""}>{s.name}</span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{s.code ?? "—"}</td>
                    <td className="py-2 px-2">
                      {s.status === "archived"
                        ? <Badge variant="secondary">Archived</Badge>
                        : <Badge>Active</Badge>}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        {s.status === "active" ? (
                          <Button size="icon" variant="ghost" title="Archive" onClick={() => run(setStatus({ data: { id: s.id, status: "archived" } }), "Archived")}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Restore" onClick={() => run(setStatus({ data: { id: s.id, status: "active" } }), "Restored")}>
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Delete (only if unused)" onClick={() => {
                          if (confirm(`Delete "${s.name}"? Only allowed if nothing references it.`)) {
                            run(del({ data: { id: s.id } }), "Deleted");
                          }
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit subject" : "New subject"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subj-name">Name</Label>
              <Input id="subj-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subj-code">Code (optional)</Label>
              <Input id="subj-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MATH" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || !form.name.trim()}>{editing ? "Save changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
