import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/timetable")({ component: Page });
const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; day_of_week: number; start_time: string; end_time: string; subjects?: { name: string } | null; teachers?: { full_name: string } | null }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("students").select("class_id,section_id").eq("user_id", user.id).maybeSingle();
      if (!s?.class_id) return;
      let q = supabase.from("timetable").select("id,day_of_week,start_time,end_time,subjects(name),teachers(full_name)").eq("class_id", s.class_id);
      if (s.section_id) q = q.eq("section_id", s.section_id);
      const { data } = await q.order("day_of_week").order("start_time");
      setRows((data as never) ?? []);
    })();
  }, [user]);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">My Timetable</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-3">Day</th><th className="text-left px-4 py-3">Time</th><th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">Teacher</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No timetable yet.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">{DAYS[r.day_of_week]}</td>
                <td className="px-4 py-2">{r.start_time} – {r.end_time}</td>
                <td className="px-4 py-2">{r.subjects?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.teachers?.full_name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
