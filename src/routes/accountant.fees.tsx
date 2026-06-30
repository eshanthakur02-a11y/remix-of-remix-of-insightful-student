import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Wallet, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/accountant/fees")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Fee Setup" description="Structures, categories, discounts, and fines." />
      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures"><Wallet className="h-4 w-4 mr-1" /> Structures</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
        </TabsList>
        <TabsContent value="structures"><Structures /></TabsContent>
        <TabsContent value="discounts"><NamedAmount table="fee_discounts" title="Discounts" valueKey="value" valueLabel="Value" kindOptions={["flat", "percent"]} /></TabsContent>
        <TabsContent value="fines"><NamedAmount table="fee_fines" title="Fines" valueKey="per_day_amount" valueLabel="Per day amount" graceField /></TabsContent>
      </Tabs>
    </>
  );
}

type Row = Record<string, unknown> & { id: string };

function Structures() {
  const { schoolId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = { name: "", amount: "", frequency: "one_time", class_id: "", due_day: "" };
  const [form, setForm] = useState(empty);
  const [genFor, setGenFor] = useState<Row | null>(null);
  const [dueDate, setDueDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name").order("name"),
    ]);
    setRows((data ?? []) as Row[]); setClasses(c ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const { error } = await supabase.from("fee_structures").insert({
      school_id: schoolId, name: form.name, amount: Number(form.amount), frequency: form.frequency,
      class_id: form.class_id || null, due_day: form.due_day ? Number(form.due_day) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Created"); setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function generate() {
    if (!genFor) return;
    const { data, error } = await supabase.rpc("generate_invoices_for_structure", { _structure_id: genFor.id, _due_date: dueDate || undefined });
    if (error) return toast.error(error.message);
    toast.success(`Generated ${data} invoices`); setGenFor(null); setDueDate("");
  }

  return (
    <>
      <DataTable rows={rows} loading={loading} filename="fee-structures" searchKeys={["name"]} emptyTitle="No fee structures"
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "name", label: "Name" },
          { key: "amount", label: "Amount" },
          { key: "frequency", label: "Frequency" },
          { key: "class_id", label: "Class", render: (r) => classes.find((c) => c.id === r.class_id)?.name ?? "All" },
          { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{String(r.status ?? "active")}</Badge> },
          { key: "_", label: "", render: (r) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="outline" onClick={() => setGenFor(r)}>Generate invoices</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New fee structure</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount *</Label><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due day</Label><Input type="number" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!genFor} onOpenChange={(o) => !o && setGenFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate invoices: {String(genFor?.name ?? "")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Creates one invoice per student in {genFor?.class_id ? "the selected class" : "the whole school"}.</p>
            <div><Label>Due date (optional)</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenFor(null)}>Cancel</Button>
              <Button onClick={generate}>Generate</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NamedAmount({ title, table, valueLabel, valueKey, kindOptions, graceField }: {
  title: string; table: string; valueLabel: string; valueKey: string;
  kindOptions?: string[]; graceField?: boolean;
}) {
  const { schoolId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const initial: Record<string, string> = { name: "", [valueKey]: "" };
  if (kindOptions) initial.kind = "flat";
  if (graceField) initial.grace_days = "0";
  const [form, setForm] = useState<Record<string, string>>(initial);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(table as never).select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]); setLoading(false);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const payload: Record<string, unknown> = { school_id: schoolId, name: form.name, [valueKey]: Number(form[valueKey]) };
    if (kindOptions) payload.kind = form.kind;
    if (graceField) payload.grace_days = Number(form.grace_days);
    const { error } = await supabase.from(table as never).insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Created"); setOpen(false); setForm(initial); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <DataTable rows={rows} loading={loading} filename={table} searchKeys={["name"]} emptyTitle={`No ${title.toLowerCase()}`}
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "name", label: "Name" },
          { key: valueKey, label: valueLabel },
          ...(kindOptions ? [{ key: "kind", label: "Kind" }] : []),
          ...(graceField ? [{ key: "grace_days", label: "Grace days" }] : []),
          { key: "_", label: "", render: (r) => <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {title}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{valueLabel} *</Label><Input required type="number" value={form[valueKey]} onChange={(e) => setForm({ ...form, [valueKey]: e.target.value })} /></div>
            {kindOptions && (
              <div><Label>Kind</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kindOptions.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {graceField && (
              <div><Label>Grace days</Label><Input type="number" value={form.grace_days} onChange={(e) => setForm({ ...form, grace_days: e.target.value })} /></div>
            )}
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
