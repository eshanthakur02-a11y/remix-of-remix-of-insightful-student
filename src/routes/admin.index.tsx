import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, GraduationCap, School, BookOpen, Bus, Megaphone, Wallet, ClipboardList } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { StatCard } from "@/components/StatCard";
import { adminNav } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type Counts = {
  students: number; teachers: number; classes: number; sections: number;
  subjects: number; routes: number; announcements: number; exams: number;
};

type RecentStudent = { id: string; full_name: string; admission_no: string | null; created_at: string };
type RecentTeacher = { id: string; full_name: string; employee_no: string | null; created_at: string };
type Announcement = { id: string; title: string; body: string | null; created_at: string };

function AdminDashboard() {
  const { user } = useAuth();
  const name = (user?.email?.split("@")[0] ?? "Admin").replace(/\b\w/g, (c) => c.toUpperCase());

  const [counts, setCounts] = useState<Counts>({
    students: 0, teachers: 0, classes: 0, sections: 0,
    subjects: 0, routes: 0, announcements: 0, exams: 0,
  });
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [recentTeachers, setRecentTeachers] = useState<RecentTeacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const head = { count: "exact" as const, head: true };
      const [s, t, c, sec, sub, r, a, e, rs, rt, an] = await Promise.all([
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
      ]);
      if (cancel) return;
      setCounts({
        students: s.count ?? 0, teachers: t.count ?? 0, classes: c.count ?? 0, sections: sec.count ?? 0,
        subjects: sub.count ?? 0, routes: r.count ?? 0, announcements: a.count ?? 0, exams: e.count ?? 0,
      });
      setRecentStudents((rs.data ?? []) as RecentStudent[]);
      setRecentTeachers((rt.data ?? []) as RecentTeacher[]);
      setAnnouncements((an.data ?? []) as Announcement[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const empty = !loading && counts.students === 0 && counts.teachers === 0 && counts.classes === 0;

  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <RoleShell role="admin" navItems={adminNav}>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Welcome back, <span className="text-primary">{name}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Live snapshot of your school — updates as you add data.</p>
      </div>

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={counts.students} icon={Users} tone="primary" />
        <StatCard label="Teachers" value={counts.teachers} icon={GraduationCap} tone="accent" />
        <StatCard label="Classes" value={counts.classes} icon={School} tone="success" />
        <StatCard label="Sections" value={counts.sections} icon={School} tone="primary" />
        <StatCard label="Subjects" value={counts.subjects} icon={BookOpen} tone="accent" />
        <StatCard label="Exams" value={counts.exams} icon={ClipboardList} tone="warning" />
        <StatCard label="Transport Routes" value={counts.routes} icon={Bus} tone="primary" />
        <StatCard label="Announcements" value={counts.announcements} icon={Megaphone} tone="success" />
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

      <div className="glass-card p-5">
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

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/admin/classes" label="Add class" icon={School} />
        <QuickAction to="/admin/teachers" label="Add teacher" icon={GraduationCap} />
        <QuickAction to="/admin/students" label="Add student" icon={Users} />
        <QuickAction to="/admin/fees" label="Set fees" icon={Wallet} />
      </div>
    </RoleShell>
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
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                {it.primary.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.primary}</div>
                <div className="text-xs text-muted-foreground truncate">{it.secondary}</div>
              </div>
              <span className="text-xs text-muted-foreground">{it.meta}</span>
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
      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
