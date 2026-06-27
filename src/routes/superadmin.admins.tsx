import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RoleShell } from "@/components/RoleShell";
import { superAdminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createSchoolAdmin } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/admins")({ component: Page });

function Page() {
  const create = useServerFn(createSchoolAdmin);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", school_id: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: sc }, { data: ad }] = await Promise.all([
      supabase.from("schools").select("id,name").order("name"),
      supabase
        .from("user_roles")
        .select("id, user_id, school_id, profiles(full_name), schools(name)")
        .eq("role", "school_admin"),
    ]);
    setSchools(sc ?? []);
    setAdmins(ad ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success("School admin created");
      setForm({ full_name: "", email: "", password: "", school_id: "" });
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create admin");
    } finally { setBusy(false); }
  }

  return (
    <RoleShell role="super_admin" navItems={superAdminNav}>
      <h1 className="text-2xl font-semibold mb-1">School Admins</h1>
      <p className="text-sm text-muted-foreground mb-6">Create a School Admin and assign them to a school.</p>

      <form onSubmit={submit} className="glass-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-3xl">
        <div className="space-y-1.5"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Temporary password</Label><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>School</Label>
          <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a school" /></SelectTrigger>
            <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Button type="submit" disabled={busy || !form.school_id}>{busy ? "Creating…" : "Create School Admin"}</Button></div>
      </form>

      <div className="glass-card p-5">
        <div className="text-sm font-medium mb-3">Existing school admins</div>
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/60 py-2">
              <div>{a.profiles?.full_name || "—"}</div>
              <div className="text-muted-foreground">{a.schools?.name || "(no school)"}</div>
            </div>
          ))}
          {admins.length === 0 && <div className="text-sm text-muted-foreground">No school admins yet.</div>}
        </div>
      </div>
    </RoleShell>
  );
}
