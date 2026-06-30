import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bus, Users, MapPin, UserCheck, FileBarChart, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/transport/")({ component: Page });

function Page() {
  const { data } = useQuery({
    queryKey: ["transport-kpis"], staleTime: 30_000,
    queryFn: async () => {
      const [v, d, r, s, a] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("transport_routes").select("id", { count: "exact", head: true }),
        supabase.from("route_stops").select("id", { count: "exact", head: true }),
        supabase.from("student_transport").select("id", { count: "exact", head: true }),
      ]);
      return { vehicles: v.count ?? 0, drivers: d.count ?? 0, routes: r.count ?? 0, stops: s.count ?? 0, assigned: a.count ?? 0 };
    },
  });
  const tiles = [
    { to: "/transport/vehicles", label: "Vehicles", icon: Truck },
    { to: "/transport/drivers", label: "Drivers", icon: Users },
    { to: "/transport/routes", label: "Routes & Stops", icon: MapPin },
    { to: "/transport/assignments", label: "Student Assignments", icon: UserCheck },
    { to: "/transport/reports", label: "Reports", icon: FileBarChart },
  ] as const;
  return (
    <>
      <PageHeader title="Transport Dashboard" description="Manage fleet, routes and student assignments." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Vehicles" value={String(data?.vehicles ?? 0)} icon={Bus} />
        <StatCard label="Drivers" value={String(data?.drivers ?? 0)} icon={Users} />
        <StatCard label="Routes" value={String(data?.routes ?? 0)} icon={MapPin} />
        <StatCard label="Stops" value={String(data?.stops ?? 0)} icon={MapPin} />
        <StatCard label="Assigned Students" value={String(data?.assigned ?? 0)} icon={UserCheck} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
