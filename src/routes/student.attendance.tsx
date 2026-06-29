import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/attendance")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; date: string; status: string }[]>([]);
  const summary = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!s) return;
      const { data } = await supabase.from("attendance").select("id,date,status").eq("student_id", s.id).order("date", { ascending: false });
      setRows(data ?? []);
    })();
  }, [user]);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">My Attendance</h1>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {(["present", "absent", "late", "leave"] as const).map((k) => (
          <div key={k} className="glass-card p-4">
            <div className="text-xs uppercase text-muted-foreground">{k}</div>
            <div className="text-2xl font-semibold">{summary[k] ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No records yet.</td></tr>
            : rows.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-4 py-2">{r.date}</td><td className="px-4 py-2 capitalize">{r.status}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
