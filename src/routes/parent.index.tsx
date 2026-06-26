import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { parentNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/parent/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("parent_students")
        .select("relationship, student:students(id, full_name, admission_no, class_id)")
        .order("created_at");
      setChildren(data ?? []);
    })();
  }, [user]);
  return (
    <RoleShell role="parent" navItems={parentNav}>
      <h1 className="text-2xl font-semibold mb-1">Parent Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Your children's attendance, results, and fees.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((c) => (
          <div key={c.student?.id} className="glass-card p-5 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-medium">{c.student?.full_name}</div>
              <div className="text-xs text-muted-foreground">Adm. {c.student?.admission_no} · {c.relationship || "Parent"}</div>
            </div>
          </div>
        ))}
        {children.length === 0 && (
          <div className="glass-card p-6 text-sm text-muted-foreground">
            No children linked yet. Your school admin can link your account to your child's profile.
          </div>
        )}
      </div>
    </RoleShell>
  );
}
