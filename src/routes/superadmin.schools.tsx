import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ShieldOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { setSchoolStatus, setStudentLoginEnabled } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/schools")({ component: Page });

type School = { id: string; name: string; code: string | null; email: string | null; phone: string | null; status: string; features: any };

function Page() {
  const setStatus = useServerFn(setSchoolStatus);
  const setSL = useServerFn(setStudentLoginEnabled);

  const [rows, setRows] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const empty = { name: "", code: "", address: "", phone: "", email: "" };
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from("schools").select("id,name,code,email,phone,status,features").order("name");
    setRows((data ?? []) as School[]);
  }
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("schools").insert(form);
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false); setForm(empty); toast.success("School created"); load();
  }
  async function toggleStatus(s: School) {
    const next = s.status === "suspended" ? "active" : "suspended";
    try { await setStatus({ data: { school_id: s.id, status: next } }); toast.success(`School ${next}`); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function toggleLogin(s: School, enabled: boolean) {
    try { await setSL({ data: { school_id: s.id, enabled } }); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Schools</h1>
          <p className="text-sm text-muted-foreground">Suspending a school blocks all its users from signing in.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New school</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create school</DialogTitle></DialogHeader>
            <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Student login</th><th className="px-4 py-2 w-32"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((s) => {
              const studentLogin = (s.features as any)?.student_login !== false;
              const suspended = s.status === "suspended";
              return (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.code ?? "—"}</td>
                  <td className="px-4 py-2">{s.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    {suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="secondary">Active</Badge>}
                  </td>
                  <td className="px-4 py-2">
                    <Switch checked={studentLogin} onCheckedChange={(v) => toggleLogin(s, v)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant={suspended ? "default" : "outline"} onClick={() => toggleStatus(s)}>
                      {suspended ? <><ShieldCheck className="h-4 w-4 mr-1" /> Activate</> : <><ShieldOff className="h-4 w-4 mr-1" /> Suspend</>}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No schools yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
