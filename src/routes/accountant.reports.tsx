import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/accountant/reports")({ component: Page });

function Page() {
  const [totals, setTotals] = useState({ collected: 0, count: 0 });
  useEffect(() => {
    supabase.from("fee_payments").select("amount_paid").then(({ data }) => {
      const sum = (data ?? []).reduce((a, r) => a + Number(r.amount_paid), 0);
      setTotals({ collected: sum, count: data?.length ?? 0 });
    });
  }, []);
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="glass-card p-5"><div className="text-xs uppercase text-muted-foreground">Total Collected</div><div className="text-3xl font-semibold">{totals.collected}</div></div>
        <div className="glass-card p-5"><div className="text-xs uppercase text-muted-foreground">Transactions</div><div className="text-3xl font-semibold">{totals.count}</div></div>
      </div>
    </>
  );
}
