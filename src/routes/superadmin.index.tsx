import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/DashboardSkeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/superadmin/")({ component: Page });

async function fetchCounts() {
  const [s, a, p] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "school_admin"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  return { schools: s.count ?? 0, admins: a.count ?? 0, users: p.count ?? 0 };
}

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-counts"],
    queryFn: fetchCounts,
    staleTime: 60_000,
  });
  return (
    <>
      <h1 className="text-2xl font-semibold mb-1">Super Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage all schools and platform-wide administrators.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading || !data ? (
          <>
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Schools" value={data.schools} icon={Building2} />
            <StatCard label="School Admins" value={data.admins} icon={ShieldCheck} />
            <StatCard label="Total Users" value={data.users} icon={Users} />
          </>
        )}
      </div>
    </>
  );
}
