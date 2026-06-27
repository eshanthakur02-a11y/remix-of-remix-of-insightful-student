import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/RoleShell";
import { studentNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentPanels } from "@/components/student-view/StudentPanels";

export const Route = createFileRoute("/student/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [student, setStudent] = useState<{ id: string; full_name: string; admission_no: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("students").select("id,full_name,admission_no").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setStudent(data ?? null));
  }, [user]);

  return (
    <RoleShell role="student" navItems={studentNav}>
      <h1 className="text-2xl font-semibold mb-1">My Dashboard</h1>
      {student
        ? <p className="text-sm text-muted-foreground mb-6">{student.full_name} · Adm. {student.admission_no}</p>
        : <p className="text-sm text-muted-foreground mb-6">Your student profile is being set up by the school.</p>}
      {student && <StudentPanels studentId={student.id} />}
    </RoleShell>
  );
}
