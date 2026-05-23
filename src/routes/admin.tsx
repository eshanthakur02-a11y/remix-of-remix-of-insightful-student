import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, Bell, School, BookOpen, GraduationCap, Users,
  UserCheck, Calendar, Wallet, ClipboardList, Bus, FileBarChart, Send, ShieldCheck,
} from "lucide-react";
import { RoleShell, FeatureGrid, type NavItem } from "@/components/RoleShell";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const items = [
  { title: "Dashboard", description: "Overview of school activity and KPIs.", icon: LayoutDashboard },
  { title: "Notifications", description: "Upload student documents and broadcast notices.", icon: Bell },
  { title: "Classes & Sections", description: "Add classes and sections by grade.", icon: School },
  { title: "Subjects", description: "Manage subjects assigned to each class.", icon: BookOpen },
  { title: "Teachers", description: "Add and manage teacher profiles.", icon: GraduationCap },
  { title: "Students", description: "Add and manage student enrollments.", icon: Users },
  { title: "Assign Teachers", description: "Map teachers to classes and subjects.", icon: UserCheck },
  { title: "Timetable", description: "Create and publish weekly timetables.", icon: Calendar },
  { title: "Fee Structure", description: "Define fee plans by class and term.", icon: Wallet },
  { title: "Exams", description: "Schedule exams and publish syllabi.", icon: ClipboardList },
  { title: "Transport", description: "Routes, buses, drivers, and assignments.", icon: Bus },
  { title: "Reports", description: "Generate academic and finance reports.", icon: FileBarChart },
  { title: "Send Notifications", description: "Push SMS/email/app alerts to stakeholders.", icon: Send },
  { title: "Monitoring & Security", description: "Audit logs, roles, and access control.", icon: ShieldCheck },
];

const nav: NavItem[] = items.map((i) => ({ to: "/admin", label: i.title, icon: i.icon }));

function AdminPage() {
  return (
    <RoleShell role="admin" navItems={nav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage the entire school — every workflow at a glance.</p>
      </div>
      <FeatureGrid items={items} />
    </RoleShell>
  );
}
