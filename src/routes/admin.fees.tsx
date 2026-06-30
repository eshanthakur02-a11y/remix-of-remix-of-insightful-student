import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Wallet, Trash2, FileText, Receipt } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/admin/fees")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Fees" description="Structures, invoices, discounts and fines." />
      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures"><Wallet className="h-4 w-4 mr-1" /> Structures</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
          <TabsTrigger value="payments"><Receipt className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="structures"><Structures /></TabsContent>
        <TabsContent value="invoices"><Invoices /></TabsContent>
        <TabsContent value="discounts"><Discounts /></TabsContent>
        <TabsContent value="fines"><Fines /></TabsContent>
        <TabsContent value="payments"><Payments /></TabsContent>
      </Tabs>
    </>
  );
}

function Structures() {
  const [rows, setRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = { name: "", amount: "", frequency: "one_time", class_id: "", due_day: "" };
  const [form, setForm] = useState(empty);
  const [genFor, setGenFor] = useState<any>(null);
  const [dueDate, setDueDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name").order("name"),
    ]);
    setRows(data ?? []); setClasses(c ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const { error } = await supabase.from("fee_structures").insert({
      school_id: prof!.school_id, name: form.name, amount: Number(form.amount), frequency: form.frequency,
      class_id: form.class_id || null, due_day: form.due_day ? Number(form.due_day) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Created"); setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this structure?")) return;
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }
  async function generate() {
    if (!genFor) return;
    const { data, error } = await supabase.rpc("generate_invoices_for_structure", { _structure_id: genFor.id, _due_date: dueDate || null });
    if (error) return toast.error(error.message);
    toast.success(`Generated ${data} invoices`); setGenFor(null); setDueDate("");
  }

  return (
    <>
      <DataTable
        rows={rows} loading={loading} filename="fee-structures"
        searchKeys={["name"]} emptyTitle="No fee structures"
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "name", label: "Name" },
          { key: "amount", label: "Amount" },
          { key: "frequency", label: "Frequency" },
          { key: "class_id", label: "Class", render: (r) => classes.find((c) => c.id === r.class_id)?.name ?? "All" },
          { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.status}</Badge> },
          { key: "actions", label: "", render: (r) => (
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
              <div><Label>Due day of month</Label><Input type="number" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} /></div>
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
          <DialogHeader><DialogTitle>Generate invoices: {genFor?.name}</DialogTitle></DialogHeader>
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

function Invoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFor, setPayFor] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("fee_invoices").select("*,students(full_name,admission_no)").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []).map((r: any) => ({ ...r, student: r.students?.full_name, adm: r.students?.admission_no, balance: Number(r.amount) - Number(r.discount) + Number(r.fine) - Number(r.paid) })));
    setLoading(false);
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    const newPaid = Number(payFor.paid) + Number(amount);
    const totalDue = Number(payFor.amount) - Number(payFor.discount) + Number(payFor.fine);
    const status = newPaid >= totalDue ? "paid" : newPaid > 0 ? "partial" : "pending";
    const { error } = await supabase.from("fee_invoices").update({ paid: newPaid, status }).eq("id", payFor.id);
    if (error) return toast.error(error.message);
    toast.success("Payment recorded"); setPayFor(null); setAmount(""); load();
  }

  async function remove(id: string) {
    if (!confirm("Delete invoice?")) return;
    const { error } = await supabase.from("fee_invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  return (
    <>
      <div className="mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        rows={rows} loading={loading} filename="fee-invoices"
        searchKeys={["title", "student", "adm"]} emptyTitle="No invoices"
        columns={[
          { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
          { key: "amount", label: "Amount" }, { key: "discount", label: "Disc" }, { key: "fine", label: "Fine" },
          { key: "paid", label: "Paid" }, { key: "balance", label: "Balance" }, { key: "due_date", label: "Due" },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "paid" ? "secondary" : r.status === "partial" ? "outline" : "default"}>{r.status}</Badge> },
          { key: "actions", label: "", render: (r) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setPayFor(r); setAmount(String(r.balance)); }} disabled={r.status === "paid"}>Pay</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <form onSubmit={recordPayment} className="space-y-3">
            <div className="text-sm">{payFor?.student} — {payFor?.title} (balance: <b>{payFor?.balance}</b>)</div>
            <div><Label>Amount *</Label><Input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Discounts() {
  return <NamedAmountList title="Discounts" table="fee_discounts" valueLabel="Value" extraField="kind" kindOptions={["flat", "percent"]} />;
}
function Fines() {
  return <NamedAmountList title="Fines" table="fee_fines" valueLabel="Per day amount" valueKey="per_day_amount" extraField="grace_days" graceField />;
}

function NamedAmountList({ title, table, valueLabel, valueKey = "value", extraField, kindOptions, graceField }: {
  title: string; table: string; valueLabel: string; valueKey?: string;
  extraField?: string; kindOptions?: string[]; graceField?: boolean;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", [valueKey]: "", [extraField ?? "x"]: extraField === "kind" ? "flat" : "0" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(table as never).select("*").order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const payload: any = { school_id: prof!.school_id, name: form.name, [valueKey]: Number(form[valueKey]) };
    if (extraField && kindOptions) payload[extraField] = form[extraField];
    if (graceField && extraField) payload[extraField] = Number(form[extraField]);
    const { error } = await supabase.from(table as never).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Created"); setOpen(false); setForm({ name: "", [valueKey]: "", [extraField ?? "x"]: extraField === "kind" ? "flat" : "0" }); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <DataTable rows={rows} loading={loading} filename={table}
        searchKeys={["name"]} emptyTitle={`No ${title.toLowerCase()}`}
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "name", label: "Name" },
          { key: valueKey, label: valueLabel },
          ...(extraField ? [{ key: extraField, label: extraField === "kind" ? "Kind" : "Grace days" }] : []),
          { key: "actions", label: "", render: (r: any) => <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {title}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{valueLabel} *</Label><Input required type="number" value={form[valueKey]} onChange={(e) => setForm({ ...form, [valueKey]: e.target.value })} /></div>
            {extraField && kindOptions && (
              <div><Label>Kind</Label>
                <Select value={form[extraField]} onValueChange={(v) => setForm({ ...form, [extraField]: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kindOptions.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {extraField && graceField && (
              <div><Label>Grace days</Label><Input type="number" value={form[extraField]} onChange={(e) => setForm({ ...form, [extraField]: e.target.value })} /></div>
            )}
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("fee_invoices").select("title,paid,updated_at,status,students(full_name,admission_no)").gt("paid", 0).order("updated_at", { ascending: false });
      setRows((data ?? []).map((r: any) => ({ ...r, student: r.students?.full_name, adm: r.students?.admission_no })));
      setLoading(false);
    })();
  }, []);
  return (
    <DataTable rows={rows} loading={loading} filename="payments"
      searchKeys={["student", "title"]} emptyTitle="No payments yet"
      columns={[
        { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
        { key: "paid", label: "Paid" }, { key: "status", label: "Status" }, { key: "updated_at", label: "Updated", render: (r) => new Date(r.updated_at).toLocaleString() },
      ]}
    />
  );
}
