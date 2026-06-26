import { createFileRoute } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { CrudTable } from "@/components/CrudTable";
import { superAdminNav } from "@/lib/nav";

export const Route = createFileRoute("/superadmin/schools")({ component: Page });

function Page() {
  return (
    <RoleShell role="super_admin" navItems={superAdminNav}>
      <CrudTable
        title="Schools"
        table="schools"
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
        ]}
        fields={[
          { key: "name", label: "School name", required: true },
          { key: "code", label: "Code (e.g. HSF-001)" },
          { key: "address", label: "Address" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
        ]}
      />
    </RoleShell>
  );
}
