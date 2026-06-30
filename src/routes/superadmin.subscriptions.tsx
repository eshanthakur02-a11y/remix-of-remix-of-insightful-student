import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/subscriptions")({ component: Page });

type Sub = {
  id: string; school_id: string; plan: string; status: string;
  starts_at: string; expires_at: string | null; seats: number; notes: string | null;
};
type School = { id: string; name: string };

const PLANS = ["free", "starter", "pro", "enterprise"];
const STATUSES = ["active", "trialing", "past_due", "cancelled"];

function Page() {
  const qc = useQueryClient();
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools-all"],
    queryFn: async () => (await supabase.from("schools").select("id,name").order("name")).data ?? [],
  });
  const { data: subs = [], isLoading } = useQuery<Sub[]>({
    queryKey: ["subscriptions"],
    queryFn: async () => (await supabase.from("subscriptions").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? "—";

  const [open, setOpen] = useState(false);
  const empty = { school_id: "", plan: "free", status: "active", starts_at: new Date().toISOString().slice(0, 10), expires_at: "", seats: 0, notes: "" };
  const [form, setForm] = useState<typeof empty>(empty);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { ...form, expires_at: form.expires_at || null, seats: Number(form.seats) || 0 };
      const { error } = await supabase.from("subscriptions").upsert(payload, { onConflict: "school_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subscription saved"); setOpen(false); setForm(empty); qc.invalidateQueries({ queryKey: ["subscriptions"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subscription removed"); qc.invalidateQueries({ queryKey: ["subscriptions"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function submit(e: FormEvent) { e.preventDefault(); upsert.mutate(); }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Plans, seats, renewal dates per school."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New / Update</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Save subscription</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>School</Label>
                  <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick school" /></SelectTrigger>
                    <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Starts</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Seats</Label><Input type="number" min={0} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter className="col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!form.school_id || upsert.isPending}>{upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2">School</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Starts</th><th className="px-4 py-2">Expires</th><th className="px-4 py-2">Seats</th><th className="px-4 py-2 w-12"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && subs.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No subscriptions.</td></tr>}
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">{schoolName(s.school_id)}</td>
                <td className="px-4 py-2"><Badge variant="outline">{s.plan}</Badge></td>
                <td className="px-4 py-2">
                  <Badge variant={s.status === "active" ? "secondary" : s.status === "cancelled" ? "destructive" : "outline"}>{s.status}</Badge>
                </td>
                <td className="px-4 py-2">{s.starts_at}</td>
                <td className="px-4 py-2">{s.expires_at ?? "—"}</td>
                <td className="px-4 py-2">{s.seats}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
