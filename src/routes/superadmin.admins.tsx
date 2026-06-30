import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createSchoolAdmin } from "@/lib/admin-users.functions";
import { setUserSuspended, resetUserPassword, deleteUser } from "@/lib/superadmin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/admins")({ component: Page });

type Row = { id: string; user_id: string; school_id: string | null; full_name: string; school_name: string; status: string };

function Page() {
  const qc = useQueryClient();
  const create = useServerFn(createSchoolAdmin);
  const setSuspended = useServerFn(setUserSuspended);
  const resetPw = useServerFn(resetUserPassword);
  const delUser = useServerFn(deleteUser);

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-min"],
    queryFn: async () => (await supabase.from("schools").select("id,name").order("name")).data ?? [],
  });
  const { data: admins = [], isLoading } = useQuery<Row[]>({
    queryKey: ["school-admins"],
    queryFn: async () => {
      const { data: roleRows } = await supabase.from("user_roles").select("id,user_id,school_id").eq("role", "school_admin");
      const rows = roleRows ?? [];
      if (!rows.length) return [];
      const userIds = rows.map((r) => r.user_id);
      const schoolIds = rows.map((r) => r.school_id).filter(Boolean) as string[];
      const [{ data: profs }, { data: scs }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,status").in("id", userIds),
        schoolIds.length ? supabase.from("schools").select("id,name").in("id", schoolIds) : Promise.resolve({ data: [] as any }),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const sMap = new Map((scs ?? []).map((s: any) => [s.id, s.name]));
      return rows.map((r) => ({
        id: r.id, user_id: r.user_id, school_id: r.school_id,
        full_name: (pMap.get(r.user_id) as any)?.full_name ?? "—",
        school_name: (sMap.get(r.school_id as string) as string | undefined) ?? "—",
        status: (pMap.get(r.user_id) as any)?.status ?? "active",
      })) as Row[];
    },
  });

  const [form, setForm] = useState({ full_name: "", email: "", school_id: "" });
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await create({ data: form }); toast.success("Invite email sent"); setForm({ full_name: "", email: "", school_id: "" }); qc.invalidateQueries({ queryKey: ["school-admins"] }); }
    catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function toggleSuspend(r: Row) {
    const suspended = r.status !== "suspended";
    try { await setSuspended({ data: { user_id: r.user_id, suspended } }); toast.success(suspended ? "Suspended" : "Activated"); qc.invalidateQueries({ queryKey: ["school-admins"] }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function reset(r: Row) {
    try { const res = await resetPw({ data: { user_id: r.user_id } }); navigator.clipboard?.writeText(res.tempPassword); toast.success(`Temp password copied: ${res.tempPassword}`); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function confirmDelete() {
    if (!pendingDelete) return;
    try { await delUser({ data: { user_id: pendingDelete.user_id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["school-admins"] }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setPendingDelete(null); }
  }

  return (
    <>
      <PageHeader title="School Admins" description="Invite, suspend, reset, or remove school admin accounts." />

      <form onSubmit={submit} className="glass-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-3xl">
        <div className="space-y-1.5"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>School</Label>
          <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a school" /></SelectTrigger>
            <SelectContent>{schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Button type="submit" disabled={busy || !form.school_id}>{busy ? "Sending…" : "Invite School Admin"}</Button></div>
      </form>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">School</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 w-72 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && admins.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No school admins yet.</td></tr>}
            {admins.map((r) => {
              const suspended = r.status === "suspended";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.full_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.school_name}</td>
                  <td className="px-4 py-2">{suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="secondary">Active</Badge>}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => reset(r)}><KeyRound className="h-4 w-4 mr-1" />Reset</Button>
                    <Button size="sm" variant={suspended ? "default" : "outline"} onClick={() => toggleSuspend(r)}>
                      {suspended ? <><ShieldCheck className="h-4 w-4 mr-1" />Activate</> : <><ShieldOff className="h-4 w-4 mr-1" />Suspend</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete school admin?"
        description={`This permanently deletes ${pendingDelete?.full_name}. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
