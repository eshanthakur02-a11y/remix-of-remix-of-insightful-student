import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Download, Bus, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/transport/reports")({ component: Page });

type Assignment = { id: string; pickup_point: string | null; students: { full_name: string; admission_no: string | null; class_id: string | null } | null; transport_routes: { name: string } | null };
type DriverRow = { id: string; full_name: string; phone: string | null; license_no: string | null; status: string };

function Page() {
  const { data } = useQuery({
    queryKey: ["transport-reports"], staleTime: 30_000,
    queryFn: async () => {
      const [a, d, v, r] = await Promise.all([
        supabase.from("student_transport").select("id,pickup_point,students(full_name,admission_no,class_id),transport_routes(name)"),
        supabase.from("drivers").select("id,full_name,phone,license_no,status"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("transport_routes").select("id", { count: "exact", head: true }),
      ]);
      return {
        assignments: (a.data ?? []) as Assignment[],
        drivers: (d.data ?? []) as DriverRow[],
        vehicles: v.count ?? 0, routes: r.count ?? 0,
      };
    },
  });
  const assignments = data?.assignments ?? [];
  const drivers = data?.drivers ?? [];

  function csvRoutes() {
    exportCSV("route-assignments", assignments, [
      { key: "route", label: "Route", get: (r) => r.transport_routes?.name ?? "" },
      { key: "student", label: "Student", get: (r) => r.students?.full_name ?? "" },
      { key: "adm", label: "Adm", get: (r) => r.students?.admission_no ?? "" },
      { key: "pickup_point", label: "Pickup" },
    ]);
  }
  function csvDrivers() {
    exportCSV("drivers", drivers, [
      { key: "full_name", label: "Name" }, { key: "phone", label: "Phone" },
      { key: "license_no", label: "License" }, { key: "status", label: "Status" },
    ]);
  }

  return (
    <>
      <PageHeader title="Transport Reports" description="Route, driver and assignment overviews." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Vehicles" value={String(data?.vehicles ?? 0)} icon={Bus} />
        <StatCard label="Routes" value={String(data?.routes ?? 0)} icon={MapPin} />
        <StatCard label="Drivers" value={String(drivers.length)} icon={Users} />
        <StatCard label="Assigned" value={String(assignments.length)} icon={Users} />
      </div>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium">Route Assignments</h2>
            <Button size="sm" variant="outline" onClick={csvRoutes}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          </div>
          <DataTable rows={assignments} loading={false} filename="route-assignments"
            searchKeys={[]} emptyTitle="No assignments"
            columns={[
              { key: "route", label: "Route", render: (r) => r.transport_routes?.name ?? "—" },
              { key: "student", label: "Student", render: (r) => r.students?.full_name ?? "—" },
              { key: "adm", label: "Adm", render: (r) => r.students?.admission_no ?? "—" },
              { key: "pickup_point", label: "Pickup", render: (r) => r.pickup_point ?? "—" },
            ]}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium">Drivers</h2>
            <Button size="sm" variant="outline" onClick={csvDrivers}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          </div>
          <DataTable rows={drivers} loading={false} filename="drivers"
            searchKeys={["full_name"]} emptyTitle="No drivers"
            columns={[
              { key: "full_name", label: "Name" }, { key: "phone", label: "Phone" },
              { key: "license_no", label: "License" }, { key: "status", label: "Status" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
