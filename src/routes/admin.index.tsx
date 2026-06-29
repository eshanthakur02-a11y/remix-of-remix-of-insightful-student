import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, GraduationCap, School, BookOpen, Bus, Megaphone, Wallet,
  ClipboardList, UserCheck, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/DashboardSkeleton";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type RecentStudent = { id: string; full_name: string; admission_no: string | null; created_at: string };
type RecentTeacher = { id: string; full_name: string; employee_no: string | null; created_at: string };
type Announcement = { id: string; title: string; body: string | null; created_at: string };

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

async function fetchAdminDashboard() {
  const head = { count: "exact" as const, head: true };
  const today = new Date().toISOString().slice(0, 10);
  const start14 = new Date(); start14.setDate(start14.getDate() - 13);

  const [s, t, c, sec, sub, r, a, e, rs, rt, an, att, fee, exUp] = await Promise.all([
    supabase.from("students").select("*", head),
    supabase.from("teachers").select("*", head),
    supabase.from("classes").select("*", head),
    supabase.from("sections").select("*", head),
    supabase.from("subjects").select("*", head),
    supabase.from("transport_routes").select("*", head),
    supabase.from("announcements").select("*", head),
    supabase.from("exams").select("*", head),
    supabase.from("students").select("id,full_name,admission_no,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("teachers").select("id,full_name,employee_no,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("attendance").select("date,status").gte("date", start14.toISOString().slice(0, 10)),
    supabase.from("fee_payments").select("amount_paid,paid_at").gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()),
    supabase.from("exams").select("id,exam_date").gte("exam_date", today),
  ]);

  const counts = {
    students: s.count ?? 0, teachers: t.count ?? 0, classes: c.count ?? 0, sections: sec.count ?? 0,
    subjects: sub.count ?? 0, routes: r.count ?? 0, announcements: a.count ?? 0, exams: e.count ?? 0,
  };

  const attRows = (att.data ?? []) as { date: string; status: string }[];
  const todays = attRows.filter((x) => x.date === today);
  const presentToday = todays.filter((x) => x.status === "present").length;
  const attendanceToday = {
    pct: todays.length ? Math.round((presentToday / todays.length) * 100) : 0,
    present: presentToday, total: todays.length,
  };
  const byDay: Record<string, { p: number; n: number }> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    byDay[d.toISOString().slice(0, 10)] = { p: 0, n: 0 };
  }
  for (const row of attRows) {
    if (!byDay[row.date]) continue;
    byDay[row.date].n += 1;
    if (row.status === "present") byDay[row.date].p += 1;
  }
  const attendanceTrend = Object.entries(byDay).map(([d, v]) => ({
    day: new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    pct: v.n ? Math.round((v.p / v.n) * 100) : 0,
  }));

  const feeRows = (fee.data ?? []) as { amount_paid: number; paid_at: string }[];
  const monthly: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    monthly[d.toISOString().slice(0, 7)] = 0;
  }
  let feesThisMonth = 0;
  const thisKey = new Date().toISOString().slice(0, 7);
  for (const f of feeRows) {
    const k = f.paid_at?.slice(0, 7);
    if (k && k in monthly) monthly[k] += Number(f.amount_paid) || 0;
    if (k === thisKey) feesThisMonth += Number(f.amount_paid) || 0;
  }
  const feeTrend = Object.entries(monthly).map(([m, amount]) => ({
    month: new Date(m + "-01").toLocaleDateString(undefined, { month: "short" }),
    amount,
  }));

  return {
    counts,
    recentStudents: (rs.data ?? []) as RecentStudent[],
    recentTeachers: (rt.data ?? []) as RecentTeacher[],
    announcements: (an.data ?? []) as Announcement[],
    attendanceToday, attendanceTrend, feesThisMonth, feeTrend,
    upcomingExams: exUp.data?.length ?? 0,
  };
}

function AdminDashboard() {
  const { user } = useAuth();
  const name = (user?.email?.split("@")[0] ?? "Admin").replace(/\b\w/g, (c) => c.toUpperCase());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 60_000,
  });

  const money = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title={`Welcome back, ${name}`} description="Live snapshot of your school — updates as you add data." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartSkeleton /><ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListSkeleton /><ListSkeleton />
        </div>
      </>
    );
  }

  const { counts, recentStudents, recentTeachers, announcements, attendanceToday, attendanceTrend, feesThisMonth, feeTrend, upcomingExams } = data;
  const empty = counts.students === 0 && counts.teachers === 0 && counts.classes === 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Live snapshot of your school — updates as you add data."
      />

      {empty && (
        <div className="glass-card p-6 mb-6 border-dashed">
          <h3 className="font-semibold mb-1">Let's set up your school</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first classes, teachers and students from the sidebar to populate this dashboard.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/classes" className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/30">+ Add classes</Link>
            <Link to="/admin/teachers" className="text-xs px-3 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/30">+ Add teachers</Link>
            <Link to="/admin/students" className="text-xs px-3 py-1.5 rounded-md bg-success/10 text-success border border-success/30">+ Add students</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Attendance Today"
          value={attendanceToday.total ? `${attendanceToday.pct}%` : "—"}
          icon={UserCheck}
          tone={attendanceToday.pct >= 85 ? "success" : attendanceToday.pct >= 70 ? "warning" : "destructive"}
        />
        <StatCard label="Fees this month" value={money(feesThisMonth)} icon={Wallet} tone="accent" />
        <StatCard label="Upcoming exams" value={upcomingExams} icon={ClipboardList} tone="warning" />
        <StatCard label="Active students" value={counts.students} icon={Users} tone="primary" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Teachers" value={counts.teachers} icon={GraduationCap} tone="accent" />
        <StatCard label="Classes" value={counts.classes} icon={School} tone="success" />
        <StatCard label="Sections" value={counts.sections} icon={School} tone="primary" />
        <StatCard label="Subjects" value={counts.subjects} icon={BookOpen} tone="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Attendance · last 14 days</h3>
            <Link to="/admin/attendance" className="text-xs text-primary hover:underline">View register →</Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashAtt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v) => `${v}%`} />
              <Area type="monotone" dataKey="pct" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#dashAtt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" /> Fee collection · last 6 months</h3>
            <Link to="/admin/fees" className="text-xs text-primary hover:underline">Fee structure →</Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={feeTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v) => money(Number(v))} />
              <Bar dataKey="amount" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RecentList
          title="Recently added students"
          icon={Users}
          empty="No students yet."
          link="/admin/students"
          items={recentStudents.map((s) => ({
            id: s.id, primary: s.full_name, secondary: s.admission_no ?? "—", meta: fmt(s.created_at),
          }))}
        />
        <RecentList
          title="Recently added teachers"
          icon={GraduationCap}
          empty="No teachers yet."
          link="/admin/teachers"
          items={recentTeachers.map((t) => ({
            id: t.id, primary: t.full_name, secondary: t.employee_no ?? "—", meta: fmt(t.created_at),
          }))}
        />
      </div>

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold inline-flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Latest announcements</h3>
          <Link to="/admin/announcements" className="text-xs text-primary hover:underline">Manage</Link>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements posted yet.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.title}</div>
                  {a.body && <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>}
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{fmt(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/admin/classes" label="Add class" icon={School} />
        <QuickAction to="/admin/teachers" label="Add teacher" icon={GraduationCap} />
        <QuickAction to="/admin/students" label="Add student" icon={Users} />
        <QuickAction to="/admin/fees" label="Set fees" icon={Wallet} />
        <QuickAction to="/admin/announcements" label="Post announcement" icon={Megaphone} />
        <QuickAction to="/admin/transport" label="Transport" icon={Bus} />
        <QuickAction to="/admin/exams" label="Schedule exam" icon={ClipboardList} />
        <QuickAction to="/admin/attendance" label="Attendance register" icon={UserCheck} />
      </div>
    </>
  );
}

function RecentList({
  title, icon: Icon, items, empty, link,
}: {
  title: string; icon: typeof Users; empty: string; link: string;
  items: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold inline-flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {title}</h3>
        <Link to={link} className="text-xs text-primary hover:underline">View all →</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0" style={{ background: "var(--gradient-primary)" }}>
                {it.primary.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.primary}</div>
                <div className="text-xs text-muted-foreground truncate">{it.secondary}</div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{it.meta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Users }) {
  return (
    <Link to={to} className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="text-sm font-medium truncate">{label}</span>
    </Link>
  );
}
