import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, CalendarCheck, Trophy, AlertTriangle, BookOpen, Download, Bell } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { StatCard } from "@/components/StatCard";
import { AttendanceArea } from "@/components/charts/AttendanceArea";
import { SubjectBars } from "@/components/charts/SubjectBars";
import { adminNav } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { students, notifications } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { user } = useAuth();
  const name = (user?.email?.split("@")[0] ?? "Admin").replace(/\b\w/g, (c) => c.toUpperCase());

  const total = students.length;
  const avgAtt = Math.round(students.reduce((a, s) => a + s.attendance, 0) / total);
  const top = students.filter((s) => s.percentage >= 70).length;
  const low = students.filter((s) => s.attendance < 75).length;
  const avgPct = Math.round(students.reduce((a, s) => a + s.percentage, 0) / total);
  const topPerformers = [...students].sort((a, b) => b.percentage - a.percentage).slice(0, 5);

  const dotTone: Record<string, string> = {
    alert: "bg-destructive",
    warning: "bg-warning",
    info: "bg-primary",
    success: "bg-success",
  };

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Welcome back, <span className="text-primary">{name}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Here's what's happening across your school today.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Fetch Data
            </Button>
            <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/30">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> All systems healthy
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Students" value={total} delta={4} icon={Users} tone="primary" />
        <StatCard label="Avg Attendance" value={`${avgAtt}%`} delta={-2} icon={CalendarCheck} tone="accent" />
        <StatCard label="Top Performers" value={top} delta={8} icon={Trophy} tone="success" />
        <StatCard label="Low Attendance" value={low} delta={5} icon={AlertTriangle} tone="warning" />
        <StatCard label="Avg %" value={`${avgPct}%`} delta={3} icon={BookOpen} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Attendance trend</h3>
              <p className="text-xs text-muted-foreground">Last 8 months</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">Avg {avgAtt}%</span>
          </div>
          <AttendanceArea />
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Subject averages</h3>
          </div>
          <SubjectBars />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Top performers</h3>
            <Link to="/admin/students" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {topPerformers.map((s, i) => (
              <div key={s.regNo} className="flex items-center gap-3 py-3">
                <div className="text-xs text-muted-foreground w-6">#{i + 1}</div>
                <img src={s.avatar} alt={s.name} className="h-9 w-9 rounded-full border border-border" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">Class {s.className} · {s.regNo}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-success/10 text-success border border-success/30">{s.percentage}%</span>
                <span className="text-xs w-7 h-7 rounded-md flex items-center justify-center border border-border">{s.grade}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold inline-flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</h3>
            <Link to="/admin/announcements" className="text-xs text-primary hover:underline">All</Link>
          </div>
          <div className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotTone[n.type] ?? "bg-primary"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoleShell>
  );
}
