import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Archive, CalendarRange, CheckCircle2, Lock, Pencil, Plus } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
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
  createSession, updateSession, activateSession, setSessionStatus,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/sessions")({ component: Page });

type Session = {
  id: string; name: string;
  start_date: string | null; end_date: string | null;
  status: string; is_current: boolean;
};

function Page() {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  const create = useServerFn(createSession);
  const update = useServerFn(updateSession);
  const activate = useServerFn(activateSession);
  const setStatus = useServerFn(setSessionStatus);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academic_sessions")
      .select("id,name,start_date,end_date,status,is_current")
      .order("start_date", { ascending: false, nullsFirst: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Session[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", start_date: "", end_date: "" });
    setOpen(true);
  }
  function openEdit(s: Session) {
    setEditing(s);
    setForm({ name: s.name, start_date: s.start_date ?? "", end_date: s.end_date ?? "" });
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) return toast.error("All fields are required");
    if (form.end_date < form.start_date) return toast.error("End date must be after start date");
    setBusy(true);
    try {
      if (editing) {
        await update({ data: { id: editing.id, name: form.name.trim(), start_date: form.start_date, end_date: form.end_date } });
        toast.success("Session updated");
      } else {
        await create({ data: { name: form.name.trim(), start_date: form.start_date, end_date: form.end_date } });
        toast.success("Session created");
      }
      setOpen(false);
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
    <RoleShell role="school_admin" navItems={adminNav}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Academic Sessions</h1>
          <p className="text-sm text-muted-foreground">Manage school years. Only one session can be active at a time.</p>
        </div>
        <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> New session</Button>
      </div>

      <section className="glass-card p-4 overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No academic sessions"
            description="Create your first session to anchor exams, timetable, and results."
            action={<Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> New session</Button>}
          />
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Starts</th>
                <th className="py-2 px-2">Ends</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="py-2 px-2 font-medium">{s.name}</td>
                  <td className="py-2 px-2 text-muted-foreground">{s.start_date ?? "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{s.end_date ?? "—"}</td>
                  <td className="py-2 px-2">
                    {s.is_current && <Badge className="mr-1">Current</Badge>}
                    {s.status === "closed" && <Badge variant="secondary">Closed</Badge>}
                    {s.status === "archived" && <Badge variant="secondary">Archived</Badge>}
                    {s.status === "active" && !s.is_current && <Badge variant="outline">Active</Badge>}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {!s.is_current && s.status === "active" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => run(activate({ data: { id: s.id } }), "Activated")}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                        </Button>
                      )}
                      {s.status === "active" && (
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => {
                          if (confirm("Close this session? It will become read-only.")) run(setStatus({ data: { id: s.id, status: "closed" } }), "Closed");
                        }}>
                          <Lock className="h-3.5 w-3.5" /> Close
                        </Button>
                      )}
                      {s.status !== "archived" && (
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => run(setStatus({ data: { id: s.id, status: "archived" } }), "Archived")}>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit session" : "New session"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" placeholder="e.g. 2025-2026" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-start">Starts</Label>
                <Input id="s-start" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-end">Ends</Label>
                <Input id="s-end" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{editing ? "Save changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RoleShell>
  );
}
