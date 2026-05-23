import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { accountantNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/accountant/payments")({ component: Page });

function Page() {
  const [students, setStudents] = useState<{ id: string; full_name: string; admission_no: string | null }[]>([]);
  const [fees, setFees] = useState<{ id: string; title: string; amount: number }[]>([]);
  const [studentId, setStudentId] = useState(""); const [feeId, setFeeId] = useState(""); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("cash"); const [ref, setRef] = useState("");
  const [recent, setRecent] = useState<Array<{ id: string; amount_paid: number; method: string | null; paid_at: string; fees?: { title: string } | null; students?: { full_name: string } | null }>>([]);

  async function loadRecent() {
    const { data } = await supabase.from("fee_payments").select("id,amount_paid,method,paid_at,fees(title),students(full_name)").order("paid_at", { ascending: false }).limit(20);
    setRecent((data as never) ?? []);
  }

  useEffect(() => {
    supabase.from("students").select("id,full_name,admission_no").order("full_name").then(({ data }) => setStudents(data ?? []));
    supabase.from("fees").select("id,title,amount").then(({ data }) => setFees(data ?? []));
    loadRecent();
  }, []);

  async function record() {
    if (!studentId || !feeId || !amount) { toast.error("Fill all fields"); return; }
    const { error } = await supabase.from("fee_payments").insert({ student_id: studentId, fee_id: feeId, amount_paid: Number(amount), method, reference: ref || null });
    if (error) toast.error(error.message); else { toast.success("Payment recorded"); setAmount(""); setRef(""); loadRecent(); }
  }

  return (
    <RoleShell role="accountant" navItems={accountantNav}>
      <h1 className="text-2xl font-semibold mb-4">Record Payment</h1>
      <div className="glass-card p-4 grid sm:grid-cols-3 gap-3 mb-6">
        <div><Label>Student</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select</option>{students.map((s) => <option key={s.id} value={s.id}>{s.admission_no ? `${s.admission_no} — ` : ""}{s.full_name}</option>)}
          </select>
        </div>
        <div><Label>Fee</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={feeId} onChange={(e) => setFeeId(e.target.value)}>
            <option value="">Select</option>{fees.map((f) => <option key={f.id} value={f.id}>{f.title} ({f.amount})</option>)}
          </select>
        </div>
        <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><Label>Method</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option><option value="cheque">Cheque</option>
          </select>
        </div>
        <div><Label>Reference</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={record} className="w-full">Record</Button></div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent Payments</h2>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Fee</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Method</th></tr></thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">{new Date(r.paid_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">{r.students?.full_name ?? "—"}</td>
                <td className="px-4 py-2">{r.fees?.title ?? "—"}</td>
                <td className="px-4 py-2">{r.amount_paid}</td>
                <td className="px-4 py-2 capitalize">{r.method ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RoleShell>
  );
}
