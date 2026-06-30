import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { createStaffUser, resetStaffPassword } from "@/lib/admin-users.functions";
import { toast } from "sonner";
import { CredentialsModal, type Cred } from "@/components/CredentialsModal";
import { TeacherAssignmentsDialog } from "@/components/TeacherAssignmentsDialog";

export const Route = createFileRoute("/admin/teachers")({ component: Page });

type Teacher = { id: string; user_id: string | null; full_name: string; phone: string | null; qualification: string | null; employee_no: string | null };

function Page() {
  const qc = useQueryClient();
  const create = useServerFn(createStaffUser);
  const resetPw = useServerFn(resetStaffPassword);

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["admin-teachers"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id,user_id,full_name,phone,qualification,employee_no").order("full_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Teacher[];
    },
  });

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const [assign, setAssign] = useState<Teacher | null>(null);

  const empty = { full_name: "", email: "", phone: "", qualification: "", employee_no: "" };
  const [form, setForm] = useState(empty);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...form, role: "teacher" } });
      toast.success("Invite email sent");
      setOpen(false); setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-teachers"] });
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setBusy(false); }
  }


  async function reset(t: Teacher) {
    if (!t.user_id) return toast.error("This teacher has no login account");
    try {
      const r = await resetPw({ data: { user_id: t.user_id } });
      setCreds([{ label: "New temporary password", value: r.tempPassword }]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Teachers</h1>
          <p className="text-sm text-muted-foreground">Invite teachers and assign them to classes &amp; subjects.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Invite teacher</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite teacher</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2"><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Employee #</Label><Input value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2">Emp #</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Qualification</th><th className="px-4 py-2 w-64"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {teachers.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-mono text-xs">{t.employee_no ?? "—"}</td>
                <td className="px-4 py-2">{t.full_name}</td>
                <td className="px-4 py-2">{t.phone ?? "—"}</td>
                <td className="px-4 py-2">{t.qualification ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setAssign(t)}><UserCog className="h-4 w-4 mr-1" /> Assignments</Button>
                  {t.user_id && <Button size="sm" variant="ghost" onClick={() => reset(t)}><KeyRound className="h-4 w-4 mr-1" /> Reset</Button>}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No teachers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {assign && <TeacherAssignmentsDialog teacher={assign} onOpenChange={(o) => !o && setAssign(null)} />}
      <CredentialsModal open={!!creds} onOpenChange={(o) => !o && setCreds(null)} creds={creds ?? []} />
    </>
  );
}
