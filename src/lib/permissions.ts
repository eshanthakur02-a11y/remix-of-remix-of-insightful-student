import type { AppRole } from "@/lib/auth";

export type Capability =
  | "manage_school" | "manage_users" | "manage_academics" | "manage_finance"
  | "manage_transport" | "manage_announcements" | "view_audit"
  | "mark_attendance" | "enter_results" | "view_own_data";

const MATRIX: Record<AppRole, Capability[]> = {
  super_admin: ["manage_school", "manage_users", "manage_academics", "manage_finance", "manage_transport", "manage_announcements", "view_audit"],
  school_admin: ["manage_school", "manage_users", "manage_academics", "manage_finance", "manage_transport", "manage_announcements", "view_audit"],
  teacher: ["mark_attendance", "enter_results"],
  accountant: ["manage_finance"],
  transport: ["manage_transport"],
  student: ["view_own_data"],
  parent: ["view_own_data"],
};

export function can(role: AppRole | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(cap) ?? false;
}
