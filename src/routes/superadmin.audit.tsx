import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/superadmin/audit")({ component: Page });

type Row = { id: string; school_id: string | null; actor_user_id: string | null; action: string; entity: string | null; entity_id: string | null; meta: any; created_at: string };

function Page() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["audit-logs", 500],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) => r.action.toLowerCase().includes(s) || (r.entity ?? "").toLowerCase().includes(s));
  }, [data, q]);
  return (
    <>
      <PageHeader title="Audit Logs" description="All sensitive platform actions, newest first." actions={<Input placeholder="Search action or entity" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />} />
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Entity</th><th className="px-4 py-2">School</th><th className="px-4 py-2">Meta</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No entries.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2"><Badge variant="outline">{r.action}</Badge></td>
                <td className="px-4 py-2 text-muted-foreground">{r.entity ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.school_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] max-w-md truncate">{r.meta && Object.keys(r.meta).length ? JSON.stringify(r.meta) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
