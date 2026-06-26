import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Users, ShieldCheck } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { StatCard } from "@/components/StatCard";
import { superAdminNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/superadmin/")({ component: Page });

function Page() {
  const [counts, setCounts] = useState({ schools: 0, admins: 0, users: 0 });
  useEffect(() => {
    (async () => {
      const [s, a, p] = await Promise.all([
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ schools: s.count ?? 0, admins: a.count ?? 0, users: p.count ?? 0 });
    })();
  }, []);
  return (
    <RoleShell role="super_admin" navItems={superAdminNav}>
      <h1 className="text-2xl font-semibold mb-1">Super Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage all schools and platform-wide administrators.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Schools" value={counts.schools} icon={Building2} />
        <StatCard label="School Admins" value={counts.admins} icon={ShieldCheck} />
        <StatCard label="Total Users" value={counts.users} icon={Users} />
      </div>
    </RoleShell>
  );
}
