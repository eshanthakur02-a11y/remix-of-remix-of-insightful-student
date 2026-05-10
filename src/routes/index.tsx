import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { AttendanceArea } from "@/components/charts/AttendanceArea";
import { PerformanceLine } from "@/components/charts/PerformanceLine";
import { SubjectBars } from "@/components/charts/SubjectBars";
import { AttendanceHeatmap } from "@/components/charts/AttendanceHeatmap";
import { students, notifications } from "@/lib/mock-data";
import { Users, CalendarCheck, Trophy, AlertTriangle, BookOpen, Sparkles, ArrowRight, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const total = students.length;
  const avgAttendance = Math.round(students.reduce((a, s) => a + s.attendance, 0) / total);
  const top = [...students].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  const lowAttendance = students.filter((s) => s.attendance < 75).length;
  const avgPercentage = Math.round(students.reduce((a, s) => a + s.percentage, 0) / total);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Welcome back, <span className="text-gradient">Anita</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening across your school today.
          </p>
        </div>
        <Badge variant="outline" className="border-success/40 text-success bg-success/10">
          <span className="h-1.5 w-1.5 rounded-full bg-success mr-2 animate-pulse" />
          Synced from Google Sheets
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={total} delta={4} icon={Users} tone="primary" />
        <StatCard label="Avg Attendance" value={`${avgAttendance}%`} delta={-2} icon={CalendarCheck} tone="accent" />
        <StatCard label="Top Performers" value={top.length} delta={8} icon={Trophy} tone="success" />
        <StatCard label="Low Attendance" value={lowAttendance} delta={5} icon={AlertTriangle} tone="warning" />
        <StatCard label="Avg %" value={`${avgPercentage}%`} delta={3} icon={BookOpen} tone="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="glass-card p-5 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Attendance trend</h3>
              <p className="text-xs text-muted-foreground">Last 8 months</p>
            </div>
            <Badge variant="secondary">Avg {avgAttendance}%</Badge>
          </div>
          <AttendanceArea />
        </div>
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Subject averages</h3>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <SubjectBars />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="glass-card p-5 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Monthly performance</h3>
              <p className="text-xs text-muted-foreground">Class average vs top score</p>
            </div>
          </div>
          <PerformanceLine />
        </div>
        <div className="glass-card p-5 animate-fade-up">
          <h3 className="font-semibold mb-2">Smart attendance heatmap</h3>
          <p className="text-xs text-muted-foreground mb-4">12 weeks · daily attendance density</p>
          <AttendanceHeatmap />
        </div>
      </div>

      {/* Top performers + notifications + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="glass-card p-5 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Top performers</h3>
            <Link to="/students" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {top.map((s, i) => (
              <Link
                key={s.regNo}
                to="/students/$regNo"
                params={{ regNo: s.regNo }}
                className="flex items-center gap-3 py-3 hover:bg-card/40 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="w-6 text-sm text-muted-foreground tabular-nums">#{i + 1}</div>
                <Avatar name={s.name} className="h-9 w-9" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Class {s.className} · {s.regNo}</div>
                </div>
                <Badge className="bg-success/15 text-success border-success/30">{s.percentage}%</Badge>
                <Badge variant="outline">{s.grade}</Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</h3>
            <Link to="/notifications" className="text-xs text-primary hover:underline">All</Link>
          </div>
          <ul className="space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    n.type === "alert" ? "bg-destructive" :
                    n.type === "warning" ? "bg-warning" :
                    n.type === "success" ? "bg-success" : "bg-primary"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{n.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-card p-5 mt-4 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br from-accent/40 to-primary/20" />
        <div className="relative flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">AI insight of the day</h3>
              <Badge variant="outline" className="text-xs">GPT · n8n</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Class 9-A is showing a 6% dip in Math averages over the past 3 weeks. Recommend a targeted
              practice module and parent-teacher follow-up for 8 at-risk students.
            </p>
            <Link to="/insights" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
              Explore AI insights <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
