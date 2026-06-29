import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentPanels } from "@/components/student-view/StudentPanels";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/parent/")({ component: Page });

type Child = { id: string; full_name: string; admission_no: string; relationship: string | null };

function Page() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("parent_students")
        .select("relationship, student:students(id, full_name, admission_no)");
      const list: Child[] = (data ?? [])
        .map((row: any) => row.student && { ...row.student, relationship: row.relationship })
        .filter(Boolean);
      setChildren(list);
      if (list[0]) setActiveId(list[0].id);
    })();
  }, [user]);

  const active = children.find((c) => c.id === activeId);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-1">Parent Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">View your child's attendance, results, and timetable.</p>

      {children.length === 0 && (
        <div className="glass-card p-6 text-sm text-muted-foreground">
          No children linked yet. Your school admin can link your account to your child's profile.
        </div>
      )}

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map((c) => (
            <Button key={c.id} size="sm" variant={c.id === activeId ? "default" : "outline"} onClick={() => setActiveId(c.id)}>
              {c.full_name}
              <span className="ml-2 text-xs opacity-70">Adm. {c.admission_no}</span>
            </Button>
          ))}
        </div>
      )}

      {active && (
        <>
          {children.length === 1 && (
            <div className="text-sm text-muted-foreground mb-4">
              {active.full_name} · Adm. {active.admission_no} {active.relationship && `· ${active.relationship}`}
            </div>
          )}
          <StudentPanels studentId={active.id} />
        </>
      )}
    </>
  );
}
