import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, Bell, MessageSquare, Calendar, CalendarCheck, FileText,
  Upload, ClipboardList, Award, CreditCard, BookOpen,
} from "lucide-react";
import { RoleShell, FeatureGrid, type NavItem } from "@/components/RoleShell";

export const Route = createFileRoute("/student")({ component: StudentPage });

const items = [
  { title: "Dashboard", description: "Your day at a glance.", icon: LayoutDashboard },
  { title: "Notifications", description: "Updates from school and teachers.", icon: Bell },
  { title: "Chat with Teachers", description: "Ask questions and get help.", icon: MessageSquare },
  { title: "Timetable", description: "View your weekly schedule.", icon: Calendar },
  { title: "Check Attendance", description: "Track your attendance percentage.", icon: CalendarCheck },
  { title: "View Homework", description: "See all assigned homework.", icon: FileText },
  { title: "Submit Assignments", description: "Upload completed work.", icon: Upload },
  { title: "Exam Schedule", description: "See upcoming exams and venues.", icon: ClipboardList },
  { title: "Check Results", description: "Results and downloadable report cards.", icon: Award },
  { title: "Pay Fees Online", description: "Pay term fees securely online.", icon: CreditCard },
  { title: "Notes & Study Material", description: "Download class notes and resources.", icon: BookOpen },
];

const nav: NavItem[] = items.map((i) => ({ to: "/student", label: i.title, icon: i.icon }));

function StudentPage() {
  return (
    <RoleShell role="student" navItems={nav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Student Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you need to learn and stay on track.</p>
      </div>
      <FeatureGrid items={items} />
    </RoleShell>
  );
}
