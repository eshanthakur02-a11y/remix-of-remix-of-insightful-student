import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { studentNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/transport")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [info, setInfo] = useState<{ pickup_point: string | null; transport_routes?: { name: string; vehicle_no: string | null; driver_name: string | null; driver_phone: string | null } | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!s) return;
      const { data } = await supabase.from("student_transport").select("pickup_point,transport_routes(name,vehicle_no,driver_name,driver_phone)").eq("student_id", s.id).maybeSingle();
      setInfo((data as never) ?? null);
    })();
  }, [user]);

  return (
    <RoleShell role="student" navItems={studentNav}>
      <h1 className="text-2xl font-semibold mb-4">Transport</h1>
      {!info ? <div className="glass-card p-6 text-sm text-muted-foreground">No transport assigned.</div>
      : <div className="glass-card p-6 space-y-2 text-sm">
        <div><span className="text-muted-foreground">Route:</span> {info.transport_routes?.name}</div>
        <div><span className="text-muted-foreground">Vehicle:</span> {info.transport_routes?.vehicle_no ?? "—"}</div>
        <div><span className="text-muted-foreground">Driver:</span> {info.transport_routes?.driver_name ?? "—"} ({info.transport_routes?.driver_phone ?? "—"})</div>
        <div><span className="text-muted-foreground">Pickup:</span> {info.pickup_point ?? "—"}</div>
      </div>}
    </RoleShell>
  );
}
