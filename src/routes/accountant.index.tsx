import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Receipt, FileBarChart, TrendingUp, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/accountant/")({ component: Page });

function Page() {
  const { data: k } = useQuery({
    queryKey: ["acct-kpis"],
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: inv }, { count: studentCount }] = await Promise.all([
        supabase.from("fee_invoices").select("amount,discount,fine,paid,status,updated_at,due_date"),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);
      const rows = inv ?? [];
      const collected = rows.reduce((a, r) => a + Number(r.paid || 0), 0);
      const pending = rows.reduce((a, r) => a + Math.max(0, Number(r.amount) - Number(r.discount) + Number(r.fine) - Number(r.paid)), 0);
      const overdue = rows.filter((r) => r.status !== "paid" && r.due_date && new Date(r.due_date) < new Date()).length;
      const month = new Date(); month.setDate(1);
      const monthRevenue = rows.filter((r) => new Date(r.updated_at) >= month).reduce((a, r) => a + Number(r.paid || 0), 0);
      return { collected, pending, overdue, monthRevenue, students: studentCount ?? 0, total: rows.length };
    },
  });

  const tiles = [
    { to: "/accountant/fees", label: "Fee Structures", icon: Wallet },
    { to: "/accountant/invoices", label: "Invoices & Collection", icon: Receipt },
    { to: "/accountant/payments", label: "Payment History", icon: Receipt },
    { to: "/accountant/reports", label: "Financial Reports", icon: FileBarChart },
  ] as const;

  return (
    <>
      <PageHeader title="Accountant Dashboard" description="Fee collection, invoices and finance overview." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Collected" value={`₹${(k?.collected ?? 0).toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Pending" value={`₹${(k?.pending ?? 0).toLocaleString()}`} icon={AlertCircle} />
        <StatCard label="This Month" value={`₹${(k?.monthRevenue ?? 0).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Students" value={String(k?.students ?? 0)} icon={Users} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="glass-card p-5 hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold">{label}</h3>
          </Link>
        ))}
      </div>
    </>
  );
}
