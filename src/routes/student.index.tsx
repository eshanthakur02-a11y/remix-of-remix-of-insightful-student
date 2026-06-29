import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentPanels } from "@/components/student-view/StudentPanels";

export const Route = createFileRoute("/student/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: student } = useQuery({
    queryKey: ["my-student", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("students")
        .select("id,full_name,admission_no").eq("user_id", user!.id).maybeSingle();
      return data ?? null;
    },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold mb-1">My Dashboard</h1>
      {student
        ? <p className="text-sm text-muted-foreground mb-6">{student.full_name} · Adm. {student.admission_no}</p>
        : <p className="text-sm text-muted-foreground mb-6">Your student profile is being set up by the school.</p>}
      {student && <StudentPanels studentId={student.id} />}
    </>
  );
}
