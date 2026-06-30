import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, ClipboardList, NotebookPen, Wallet, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentPanels } from "@/components/student-view/StudentPanels";

export const Route = createFileRoute("/student/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const { data } = useQuery({
    queryKey: ["student-dash", uid],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: s } = await supabase
        .from("students")
        .select("id,full_name,section_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (!s) return null;
      const [{ data: att }, { count: hwCount }, { data: inv }] = await Promise.all([
        supabase.from("attendance").select("status").eq("student_id", s.id),
        supabase.from("homework").select("*", { count: "exact", head: true }).eq("section_id", s.section_id ?? "").eq("status", "active"),
        supabase.from("fee_invoices").select("amount,paid_amount,status").eq("student_id", s.id).neq("status", "paid"),
      ]);
      const total = att?.length ?? 0;
      const present = att?.filter((r: any) => r.status === "present").length ?? 0;
      const due = (inv ?? []).reduce((a, r: any) => a + Math.max(0, Number(r.amount) - Number(r.paid_amount ?? 0)), 0);
      return {
        student: s,
        attendanceRate: total ? Math.round((present / total) * 100) : null,
        pendingHw: hwCount ?? 0,
        feeDue: due,
      };
    },
  });

  const stats = [
    { label: "Attendance", value: data?.attendanceRate != null ? `${data.attendanceRate}%` : "—", icon: UserCheck, to: "/student/attendance" },
    { label: "Pending Homework", value: data?.pendingHw ?? 0, icon: NotebookPen, to: "/student/homework" },
    { label: "Fee Due", value: data?.feeDue ? `₹${data.feeDue}` : "₹0", icon: Wallet, to: "/student/fees" },
    { label: "Timetable", value: "View", icon: Calendar, to: "/student/timetable" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Hi {data?.student?.full_name?.split(" ")[0] ?? "Student"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Your school day at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="glass-card p-4 hover:border-primary/40 transition-colors">
            <Icon className="h-4 w-4 text-muted-foreground mb-2" />
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </Link>
        ))}
      </div>

      {data?.student && <StudentPanels studentId={data.student.id} />}

      <div className="mt-6">
        <Link to="/student/results" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium">View report card</div>
            <div className="text-xs text-muted-foreground">See published exam results and print your report.</div>
          </div>
        </Link>
      </div>
    </>
  );
}
