import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/student/fees")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [student, setStudent] = useState<{ id: string; class_id: string | null } | null>(null);
  const [fees, setFees] = useState<{ id: string; title: string; amount: number; due_date: string | null }[]>([]);
  const [payments, setPayments] = useState<{ fee_id: string; amount_paid: number }[]>([]);

  async function load() {
    if (!user) return;
    const { data: s } = await supabase.from("students").select("id,class_id").eq("user_id", user.id).maybeSingle();
    if (!s) return;
    setStudent(s);
    const { data: f } = await supabase.from("fees").select("id,title,amount,due_date").or(`class_id.is.null,class_id.eq.${s.class_id}`);
    setFees(f ?? []);
    const { data: p } = await supabase.from("fee_payments").select("fee_id,amount_paid").eq("student_id", s.id);
    setPayments(p ?? []);
  }

  useEffect(() => { load(); }, [user]); // eslint-disable-line

  function paidFor(feeId: string) { return payments.filter((p) => p.fee_id === feeId).reduce((a, p) => a + Number(p.amount_paid), 0); }

  async function pay(fee: { id: string; amount: number }) {
    if (!student) return;
    const due = Number(fee.amount) - paidFor(fee.id);
    if (due <= 0) return;
    const { error } = await supabase.from("fee_payments").insert({ fee_id: fee.id, student_id: student.id, amount_paid: due, method: "online", reference: `MOCK-${Date.now()}` });
    if (error) toast.error(error.message); else { toast.success("Payment successful"); load(); }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">My Fees</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Title</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Paid</th><th className="text-left px-4 py-3">Due</th><th className="text-left px-4 py-3">Action</th></tr></thead>
          <tbody>
            {fees.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No fees assigned.</td></tr>
            : fees.map((f) => {
              const paid = paidFor(f.id);
              const due = Number(f.amount) - paid;
              return (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2">{f.title}</td>
                  <td className="px-4 py-2">{f.amount}</td>
                  <td className="px-4 py-2">{paid}</td>
                  <td className="px-4 py-2 font-medium">{due}</td>
                  <td className="px-4 py-2">{due > 0 ? <Button size="sm" onClick={() => pay(f)}>Pay Now</Button> : <span className="text-xs text-green-500">Paid</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
