import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, Bell, BookOpen, Wallet, CalendarCheck, FileText,
  PenLine, ClipboardList, TrendingUp, MessageSquare, PlaneTakeoff,
} from "lucide-react";
import { RoleShell, FeatureGrid, type NavItem } from "@/components/RoleShell";

export const Route = createFileRoute("/teacher")({ component: TeacherPage });

const items = [
  { title: "Dashboard", description: "Today's classes, tasks, and reminders.", icon: LayoutDashboard },
  { title: "Notifications", description: "Announcements from admin and parents.", icon: Bell },
  { title: "My Classes & Subjects", description: "View assigned classes and subjects.", icon: BookOpen },
  { title: "Salary Details", description: "Monthly salary slips and history.", icon: Wallet },
  { title: "Take Attendance", description: "Mark daily attendance per class.", icon: CalendarCheck },
  { title: "Upload Homework", description: "Share homework and assignments.", icon: FileText },
  { title: "Conduct Tests", description: "Create and run online/offline tests.", icon: PenLine },
  { title: "Enter Marks", description: "Record exam and test scores.", icon: ClipboardList },
  { title: "Student Performance", description: "Generate performance reports.", icon: TrendingUp },
  { title: "Send Remarks", description: "Send parent remarks and feedback.", icon: MessageSquare },
  { title: "Apply Leave", description: "Submit leave requests to admin.", icon: PlaneTakeoff },
];

const nav: NavItem[] = items.map((i) => ({ to: "/teacher", label: i.title, icon: i.icon }));

function TeacherPage() {
  return (
    <RoleShell role="teacher" navItems={nav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Teacher Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your daily academic activities in one place.</p>
      </div>
      <FeatureGrid items={items} />
    </RoleShell>
  );
}
