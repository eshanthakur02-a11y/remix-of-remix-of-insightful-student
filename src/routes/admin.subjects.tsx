import { createFileRoute } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/subjects")({ component: Page });

function Page() {
  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <CrudTable
        title="Subjects"
        table="subjects"
        columns={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }]}
        fields={[
          { key: "name", label: "Subject name", required: true },
          { key: "code", label: "Code (optional)" },
        ]}
      />
    </RoleShell>
  );
}
