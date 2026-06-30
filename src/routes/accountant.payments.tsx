import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/accountant/payments")({ component: Page });

type Row = { id: string; title: string; paid: number; status: string; updated_at: string; student?: string; adm?: string };

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("fee_invoices")
      .select("id,title,paid,status,updated_at,students(full_name,admission_no)")
      .gt("paid", 0).order("updated_at", { ascending: false }).limit(500);
    type Raw = { id: string; title: string; paid: number; status: string; updated_at: string; students: { full_name: string; admission_no: string | null } | null };
    setRows(((data ?? []) as Raw[]).map((r) => ({
      id: r.id, title: r.title, paid: r.paid, status: r.status, updated_at: r.updated_at,
      student: r.students?.full_name, adm: r.students?.admission_no ?? "",
    })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader title="Payment History" description="All collected payments across invoices." />
      <DataTable rows={rows} loading={loading} filename="payments"
        searchKeys={["student", "title", "adm"]} emptyTitle="No payments yet"
        columns={[
          { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
          { key: "paid", label: "Paid" }, { key: "status", label: "Status" },
          { key: "updated_at", label: "Date", render: (r) => new Date(r.updated_at).toLocaleString() },
        ]}
      />
    </>
  );
}
