import { createFileRoute } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/teachers")({ component: Page });

function Page() {
  return (
    <RoleShell role="admin" navItems={adminNav}>
      <CrudTable
        title="Teachers"
        table="teachers"
        columns={[
          { key: "employee_no", label: "Emp #" },
          { key: "full_name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "qualification", label: "Qualification" },
        ]}
        fields={[
          { key: "employee_no", label: "Employee number" },
          { key: "full_name", label: "Full name", required: true },
          { key: "phone", label: "Phone" },
          { key: "qualification", label: "Qualification" },
        ]}
      />
    </RoleShell>
  );
}
