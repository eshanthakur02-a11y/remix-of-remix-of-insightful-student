import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CrudTable } from "@/components/CrudTable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transport/assignments")({ component: Page });

function Page() {
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("students").select("id,full_name").order("full_name").then(({ data }) => setStudents(data ?? []));
    supabase.from("transport_routes").select("id,name").then(({ data }) => setRoutes(data ?? []));
  }, []);
  return (
    <>
      <CrudTable title="Student Assignments" table="student_transport"
        columns={[
          { key: "student_id", label: "Student", render: (r) => students.find((s) => s.id === r.student_id)?.full_name ?? "—" },
          { key: "route_id", label: "Route", render: (r) => routes.find((x) => x.id === r.route_id)?.name ?? "—" },
          { key: "pickup_point", label: "Pickup" },
        ]}
        fields={[
          { key: "student_id", label: "Student", type: "select", required: true, options: students.map((s) => ({ value: s.id, label: s.full_name })) },
          { key: "route_id", label: "Route", type: "select", required: true, options: routes.map((r) => ({ value: r.id, label: r.name })) },
          { key: "pickup_point", label: "Pickup point" },
        ]}
      />
    </>
  );
}
