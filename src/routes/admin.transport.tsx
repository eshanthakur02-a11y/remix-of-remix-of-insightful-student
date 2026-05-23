import { createFileRoute } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/transport")({ component: Page });

function Page() {
  return (
    <RoleShell role="admin" navItems={adminNav}>
      <CrudTable
        title="Transport Routes"
        table="transport_routes"
        columns={[
          { key: "name", label: "Route" },
          { key: "vehicle_no", label: "Vehicle" },
          { key: "driver_name", label: "Driver" },
          { key: "driver_phone", label: "Phone" },
        ]}
        fields={[
          { key: "name", label: "Route name", required: true },
          { key: "vehicle_no", label: "Vehicle number" },
          { key: "driver_name", label: "Driver name" },
          { key: "driver_phone", label: "Driver phone" },
        ]}
      />
    </RoleShell>
  );
}
