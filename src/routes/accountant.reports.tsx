import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, AlertCircle, Receipt, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV } from "@/lib/csv-export";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/accountant/reports")({ component: Page });

type Inv = { amount: number; discount: number; fine: number; paid: number; status: string; updated_at: string; due_date: string | null; title: string; students: { full_name: string; admission_no: string | null } | null };

function Page() {
  const { data } = useQuery({
    queryKey: ["acct-report"], staleTime: 30_000,
    queryFn: async (): Promise<Inv[]> => {
      const { data } = await supabase.from("fee_invoices")
        .select("amount,discount,fine,paid,status,updated_at,due_date,title,students(full_name,admission_no)")
        .order("updated_at", { ascending: false }).limit(2000);
      return (data ?? []) as Inv[];
    },
  });
  const rows = data ?? [];
  const collected = rows.reduce((a, r) => a + Number(r.paid), 0);
  const pending = rows.reduce((a, r) => a + Math.max(0, Number(r.amount) - Number(r.discount) + Number(r.fine) - Number(r.paid)), 0);
  const overdue = rows.filter((r) => r.status !== "paid" && r.due_date && new Date(r.due_date) < new Date()).length;

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (!r.paid) continue;
    const k = new Date(r.updated_at).toLocaleString("default", { month: "short", year: "2-digit" });
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(r.paid));
  }
  const monthly = Array.from(byMonth.entries()).reverse().slice(-12).map(([month, total]) => ({ month, total }));

  function csv() {
    exportCSV("collection", rows, [
      { key: "student", label: "Student", get: (r) => r.students?.full_name ?? "" },
      { key: "adm", label: "Adm", get: (r) => r.students?.admission_no ?? "" },
      { key: "title", label: "Invoice" }, { key: "amount", label: "Amount" }, { key: "discount", label: "Discount" },
      { key: "fine", label: "Fine" }, { key: "paid", label: "Paid" }, { key: "status", label: "Status" },
      { key: "updated_at", label: "Updated" },
    ]);
  }

  return (
    <>
      <PageHeader title="Financial Reports" description="Collection analytics and exports."
        actions={<>
          <Button size="sm" variant="outline" onClick={csv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
        </>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Collected" value={`₹${collected.toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Pending" value={`₹${pending.toLocaleString()}`} icon={AlertCircle} />
        <StatCard label="Overdue" value={String(overdue)} icon={Receipt} />
        <StatCard label="Invoices" value={String(rows.length)} icon={Wallet} />
      </div>
      <div className="glass-card p-4">
        <div className="text-sm font-medium mb-3">Monthly Collection</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
