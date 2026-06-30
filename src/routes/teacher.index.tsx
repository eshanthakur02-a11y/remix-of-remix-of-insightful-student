import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, ClipboardList, UserCheck, NotebookPen, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/teacher/")({ component: Page });

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const { data } = useQuery({
    queryKey: ["teacher-dash", uid],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", uid).maybeSingle();
      if (!t) return { sections: [], studentCount: 0, today: [], pendingHw: 0 };
      const { data: ass } = await supabase
        .from("teacher_assignments")
        .select("section_id, class_id, sections(name), classes(name)")
        .eq("teacher_id", t.id);
      const secIds = Array.from(new Set((ass ?? []).map((a: any) => a.section_id).filter(Boolean)));
      const { count: studentCount } = secIds.length
        ? await supabase.from("students").select("*", { count: "exact", head: true }).in("section_id", secIds)
        : { count: 0 };
      const today = new Date().getDay();
      const { data: tt } = await supabase
        .from("timetable")
        .select("id,start_time,end_time,day_of_week,subjects(name),classes(name),sections(name)")
        .eq("teacher_id", t.id)
        .eq("day_of_week", today)
        .order("start_time");
      const { count: pendingHw } = await supabase
        .from("homework")
        .select("*", { count: "exact", head: true })
        .eq("created_by", uid)
        .eq("status", "active");
      return { sections: ass ?? [], studentCount: studentCount ?? 0, today: tt ?? [], pendingHw: pendingHw ?? 0 };
    },
  });

  const stats = [
    { label: "My Sections", value: data?.sections.length ?? 0, icon: Users, to: "/teacher/timetable" },
    { label: "Students Reached", value: data?.studentCount ?? 0, icon: UserCheck, to: "/teacher/attendance" },
    { label: "Classes Today", value: data?.today.length ?? 0, icon: Calendar, to: "/teacher/timetable" },
    { label: "Active Homework", value: data?.pendingHw ?? 0, icon: NotebookPen, to: "/teacher/homework" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Teacher Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Today is {DAYS[new Date().getDay()]}, {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="glass-card p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" /><h2 className="font-medium">Today's Classes</h2>
          </div>
          {(data?.today.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">No classes scheduled today.</div>
          ) : (
            <div className="space-y-2">
              {data!.today.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b border-border/60 py-2 last:border-0">
                  <div>
                    <div className="font-medium">{t.subjects?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.classes?.name} · {t.sections?.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.start_time?.slice(0, 5)} – {t.end_time?.slice(0, 5)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4" /><h2 className="font-medium">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/teacher/attendance" className="rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><UserCheck className="h-4 w-4 mb-1" />Mark Attendance</Link>
            <Link to="/teacher/homework" className="rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><NotebookPen className="h-4 w-4 mb-1" />Assign Homework</Link>
            <Link to="/teacher/results" className="rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><ClipboardList className="h-4 w-4 mb-1" />Enter Results</Link>
            <Link to="/teacher/library" className="rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><Library className="h-4 w-4 mb-1" />Library</Link>
          </div>
        </section>
      </div>
    </>
  );
}
