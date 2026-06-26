import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { parentNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parent/children")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("parent_students")
        .select("relationship, student:students(id, full_name, admission_no)");
      setRows(data ?? []);
    })();
  }, []);
  return (
    <RoleShell role="parent" navItems={parentNav}>
      <h1 className="text-2xl font-semibold mb-1">My Children</h1>
      <p className="text-sm text-muted-foreground mb-6">Profiles linked to your account.</p>
      <div className="glass-card p-5 space-y-2">
        {rows.map((r) => (
          <div key={r.student?.id} className="flex items-center justify-between text-sm border-b border-border/60 py-2">
            <div className="font-medium">{r.student?.full_name}</div>
            <div className="text-muted-foreground">Adm. {r.student?.admission_no} · {r.relationship || "—"}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No children linked.</div>}
      </div>
    </RoleShell>
  );
}
