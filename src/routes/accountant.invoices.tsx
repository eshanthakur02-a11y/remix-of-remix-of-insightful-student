import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, Printer } from "lucide-react";
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

export const Route = createFileRoute("/accountant/invoices")({ component: Page });

type Invoice = {
  id: string; title: string; amount: number; discount: number; fine: number; paid: number;
  due_date: string | null; status: string; student_id: string; updated_at: string;
  students?: { full_name: string; admission_no: string | null } | null;
  student?: string; adm?: string; balance?: number;
};

function Page() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("fee_invoices").select("*,students(full_name,admission_no)").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(((data ?? []) as Invoice[]).map((r) => ({
      ...r, student: r.students?.full_name, adm: r.students?.admission_no ?? "",
      balance: Number(r.amount) - Number(r.discount) + Number(r.fine) - Number(r.paid),
    })));
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
    // Also log to fee_payments if fees table linkage exists - skipping legacy fees table.
    toast.success("Payment recorded");
    setReceipt({ ...payFor, paid: newPaid, status });
    setPayFor(null); setAmount(""); setRef(""); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete invoice?")) return;
    const { error } = await supabase.from("fee_invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <PageHeader title="Invoices & Collection" description="Student fee ledger with discounts, fines, and receipts." />
      <div className="mb-3 flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable rows={rows} loading={loading} filename="fee-invoices"
        searchKeys={["title", "student", "adm"]} emptyTitle="No invoices"
        columns={[
          { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
          { key: "amount", label: "Amount" }, { key: "discount", label: "Disc" }, { key: "fine", label: "Fine" },
          { key: "paid", label: "Paid" }, { key: "balance", label: "Balance" }, { key: "due_date", label: "Due" },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "paid" ? "secondary" : r.status === "partial" ? "outline" : "default"}>{r.status}</Badge> },
          { key: "_", label: "", render: (r: Invoice) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setPayFor(r); setAmount(String(r.balance ?? 0)); }} disabled={r.status === "paid"}>Pay</Button>
              <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}><Printer className="h-4 w-4" /></Button>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <div id="receipt-print" className="space-y-2 text-sm">
              <div className="text-lg font-semibold">Scholaris — Fee Receipt</div>
              <div>Date: {new Date().toLocaleString()}</div>
              <div>Student: <b>{receipt.student}</b> ({receipt.adm})</div>
              <div>Invoice: {receipt.title}</div>
              <table className="w-full border mt-2">
                <tbody>
                  <tr><td className="border p-2">Amount</td><td className="border p-2 text-right">{receipt.amount}</td></tr>
                  <tr><td className="border p-2">Discount</td><td className="border p-2 text-right">{receipt.discount}</td></tr>
                  <tr><td className="border p-2">Fine</td><td className="border p-2 text-right">{receipt.fine}</td></tr>
                  <tr><td className="border p-2 font-semibold">Paid</td><td className="border p-2 text-right font-semibold">{receipt.paid}</td></tr>
                  <tr><td className="border p-2">Balance</td><td className="border p-2 text-right">{Number(receipt.amount) - Number(receipt.discount) + Number(receipt.fine) - Number(receipt.paid)}</td></tr>
                </tbody>
              </table>
              <div className="mt-2">Status: <b>{receipt.status}</b></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceipt(null)}>Close</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
