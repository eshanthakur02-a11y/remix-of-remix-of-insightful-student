import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CrudTable } from "@/components/CrudTable";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transport/assignments")({ component: Page });

function Page() {
  const [students, setStudents] = useState<{ id: string; full_name: string; admission_no: string | null }[]>([]);
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("students").select("id,full_name,admission_no").order("full_name").then(({ data }) => setStudents(data ?? []));
    supabase.from("transport_routes").select("id,name").order("name").then(({ data }) => setRoutes(data ?? []));
  }, []);
  return (
    <>
      <PageHeader title="Student Assignments" description="Assign students to routes and pickup points." />
      <CrudTable title="Assignments" table="student_transport"
        columns={[
          { key: "student_id", label: "Student", render: (r) => {
            const s = students.find((x) => x.id === r.student_id);
            return s ? `${s.admission_no ? s.admission_no + " — " : ""}${s.full_name}` : "—";
          }},
          { key: "route_id", label: "Route", render: (r) => routes.find((x) => x.id === r.route_id)?.name ?? "—" },
          { key: "pickup_point", label: "Pickup point" },
        ]}
        fields={[
          { key: "student_id", label: "Student", type: "select", required: true, options: students.map((s) => ({ value: s.id, label: `${s.admission_no ? s.admission_no + " — " : ""}${s.full_name}` })) },
          { key: "route_id", label: "Route", type: "select", required: true, options: routes.map((r) => ({ value: r.id, label: r.name })) },
          { key: "pickup_point", label: "Pickup point" },
        ]}
      />
    </>
  );
}
