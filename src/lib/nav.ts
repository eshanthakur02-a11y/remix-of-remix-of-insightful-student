import {
  LayoutDashboard, School, BookOpen, GraduationCap, Users, Calendar,
  Wallet, ClipboardList, Bus, Megaphone, UserCheck, MessageSquare,
  Receipt, FileBarChart, Building2, Heart, CalendarRange,
  Bell, Settings, ShieldCheck, Library, NotebookPen, FileText,
} from "lucide-react";
import type { NavItem } from "@/components/RoleShell";

export const superAdminNav: NavItem[] = [
  { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/superadmin/schools", label: "Schools", icon: Building2, group: "Tenants" },
  { to: "/superadmin/admins", label: "School Admins", icon: GraduationCap, group: "Tenants" },
];

export const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },

  { to: "/admin/sessions", label: "Academic Sessions", icon: CalendarRange, group: "Academics" },
  { to: "/admin/classes", label: "Classes & Sections", icon: School, group: "Academics" },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen, group: "Academics" },
  { to: "/admin/timetable", label: "Timetable", icon: Calendar, group: "Academics" },
  { to: "/admin/homework", label: "Homework", icon: NotebookPen, group: "Academics" },
  { to: "/admin/exams", label: "Exams & Results", icon: ClipboardList, group: "Academics" },
  { to: "/admin/library", label: "Library", icon: Library, group: "Academics" },

  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap, group: "People" },
  { to: "/admin/students", label: "Students", icon: Users, group: "People" },
  { to: "/admin/parents", label: "Parents", icon: Heart, group: "People" },
  { to: "/admin/assignments", label: "Assign Teachers", icon: UserCheck, group: "People" },
  { to: "/admin/users", label: "User Management", icon: ShieldCheck, group: "People" },

  { to: "/admin/attendance", label: "Attendance Register", icon: UserCheck, group: "Operations" },
  { to: "/admin/transport", label: "Transport", icon: Bus, group: "Operations" },

  { to: "/admin/fees", label: "Fee Structure", icon: Wallet, group: "Finance" },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart, group: "Finance" },

  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, group: "Communication" },
  { to: "/messages", label: "Messages", icon: MessageSquare, group: "Communication" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Communication" },

  { to: "/admin/settings", label: "School Settings", icon: Settings, group: "System" },
  { to: "/admin/audit", label: "Audit Logs", icon: FileText, group: "System" },
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

export const parentNav: NavItem[] = [
  { to: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { to: "/parent/children", label: "My Children", icon: Heart },
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
