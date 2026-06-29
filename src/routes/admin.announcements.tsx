import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/announcements")({ component: Page });

function Page() {
  return (
    <>
      <CrudTable
        title="Announcements"
        table="announcements"
        columns={[
          { key: "title", label: "Title" },
          { key: "audience", label: "Audience" },
          { key: "created_at", label: "Posted", render: (r: { created_at: string }) => new Date(r.created_at).toLocaleString() },
        ]}
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "body", label: "Message" },
          { key: "audience", label: "Audience", type: "select", required: true, options: [
            { value: "all", label: "All" }, { value: "students", label: "Students" },
            { value: "teachers", label: "Teachers" }, { value: "accountants", label: "Accountants" },
            { value: "transport", label: "Transport" },
          ] },
        ]}
      />
    </>
  );
}
