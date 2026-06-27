// Shared panels used by both Student and Parent dashboards.
// Takes a studentId and renders read-only summaries.
import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, BookOpen, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function Card({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
        <h2 className="font-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function AttendancePanel({ studentId }: { studentId: string }) {
  const [stats, setStats] = useState<{ present: number; absent: number; total: number } | null>(null);
  useEffect(() => {
    if (!studentId) return;
    supabase.from("attendance").select("status").eq("student_id", studentId).then(({ data }) => {
      const rows = data ?? [];
      const present = rows.filter((r: any) => r.status === "present").length;
      const absent = rows.filter((r: any) => r.status === "absent").length;
      setStats({ present, absent, total: rows.length });
    });
  }, [studentId]);
  return (
    <Card icon={UserCheck} title="Attendance">
      {!stats ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : stats.total === 0 ? (
        <div className="text-sm text-muted-foreground">No attendance recorded yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-2xl font-semibold">{stats.present}</div><div className="text-xs text-muted-foreground">Present</div></div>
          <div><div className="text-2xl font-semibold text-destructive">{stats.absent}</div><div className="text-xs text-muted-foreground">Absent</div></div>
          <div><div className="text-2xl font-semibold">{Math.round((stats.present / stats.total) * 100)}%</div><div className="text-xs text-muted-foreground">Rate</div></div>
        </div>
      )}
    </Card>
  );
}

export function ResultsPanel({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    if (!studentId) return;
    supabase.from("exam_results")
      .select("marks,max_marks,subjects(name),exams(name)")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setRows(data ?? []));
  }, [studentId]);
  return (
    <Card icon={ClipboardList} title="Recent results">
      {!rows ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No results published yet.</div>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {rows.map((r: any, i: number) => (
            <li key={i} className="py-2 flex items-center justify-between">
              <div>
                <div>{r.subjects?.name ?? "Subject"}</div>
                <div className="text-xs text-muted-foreground">{r.exams?.name ?? "Exam"}</div>
              </div>
              <div className="font-mono">{r.marks ?? "—"}/{r.max_marks ?? "—"}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HomeworkPanel({ studentId }: { studentId: string }) {
  // Homework module not yet wired; render placeholder so the panel slot is consistent.
  return (
    <Card icon={BookOpen} title="Homework">
      <div className="text-sm text-muted-foreground">Homework module ships in the next phase.</div>
    </Card>
  );
}

export function TimetablePanel({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const { data: st } = await supabase.from("students").select("class_id,section_id").eq("id", studentId).single();
      if (!st?.class_id) { setRows([]); return; }
      const { data } = await supabase.from("timetable")
        .select("day,period,start_time,end_time,subjects(name),teachers(full_name)")
        .eq("class_id", st.class_id).eq("section_id", st.section_id ?? "")
        .order("day").order("period");
      setRows(data ?? []);
    })();
  }, [studentId]);
  return (
    <Card icon={CalendarDays} title="Timetable">
      {!rows ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No timetable published yet.</div>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {rows.slice(0, 6).map((r: any, i: number) => (
            <li key={i} className="py-2 flex items-center justify-between">
              <div><div>{r.subjects?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.day} · P{r.period}</div></div>
              <div className="text-xs text-muted-foreground">{r.teachers?.full_name ?? "—"}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function StudentPanels({ studentId }: { studentId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AttendancePanel studentId={studentId} />
      <ResultsPanel studentId={studentId} />
      <TimetablePanel studentId={studentId} />
      <HomeworkPanel studentId={studentId} />
    </div>
  );
}
