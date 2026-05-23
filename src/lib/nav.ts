import {
  LayoutDashboard, School, BookOpen, GraduationCap, Users, Calendar,
  Wallet, ClipboardList, Bus, Megaphone, UserCheck, MessageSquare,
  Receipt, FileBarChart,
} from "lucide-react";
import type { NavItem } from "@/components/RoleShell";

export const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/classes", label: "Classes & Sections", icon: School },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/assignments", label: "Assign Teachers", icon: UserCheck },
  { to: "/admin/timetable", label: "Timetable", icon: Calendar },
  { to: "/admin/fees", label: "Fees", icon: Wallet },
  { to: "/admin/exams", label: "Exams", icon: ClipboardList },
  { to: "/admin/transport", label: "Transport", icon: Bus },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];

export const teacherNav: NavItem[] = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/attendance", label: "Attendance", icon: UserCheck },
  { to: "/teacher/results", label: "Exam Results", icon: ClipboardList },
  { to: "/teacher/timetable", label: "Timetable", icon: Calendar },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];

export const studentNav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/timetable", label: "Timetable", icon: Calendar },
  { to: "/student/attendance", label: "My Attendance", icon: UserCheck },
  { to: "/student/results", label: "My Results", icon: ClipboardList },
  { to: "/student/fees", label: "My Fees", icon: Wallet },
  { to: "/student/transport", label: "Transport", icon: Bus },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];

export const accountantNav: NavItem[] = [
  { to: "/accountant", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accountant/fees", label: "Fee Structure", icon: Wallet },
  { to: "/accountant/payments", label: "Payments", icon: Receipt },
  { to: "/accountant/reports", label: "Reports", icon: FileBarChart },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];

export const transportNav: NavItem[] = [
  { to: "/transport", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transport/routes", label: "Routes", icon: Bus },
  { to: "/transport/assignments", label: "Assignments", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];
