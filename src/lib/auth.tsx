import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "student"
  | "parent"
  | "accountant"
  | "transport";

export type AccountStatus = "invited" | "active" | "suspended";

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant",
  transport: "Transport Manager",
};

// Routes are kept as the slugs Phase 1 generated (single word). The spec's
// "/super-admin" is informational; what matters is the role→dashboard mapping.
export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/superadmin",
  school_admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
  accountant: "/accountant",
  transport: "/transport",
};

export type ProfileInfo = {
  status: AccountStatus | null;
  schoolStatus: "active" | "suspended" | null;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileInfo>({ status: null, schoolStatus: null });
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setSchoolId(null);
      setResolvedUserId(null);
      setProfile({ status: null, schoolStatus: null });
      setProfileLoading(false);
      return;
    }
    let cancel = false;
    setProfileLoading(true);
    setResolvedUserId(null);
    (async () => {
      const [{ data: roleRow }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role,school_id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("school_id,status").eq("id", user.id).maybeSingle(),
      ]);
      if (cancel) return;
      const r = (roleRow?.role as AppRole) ?? null;
      const sid = (prof?.school_id as string | null) ?? (roleRow?.school_id as string | null) ?? null;
      let schoolStatus: ProfileInfo["schoolStatus"] = null;
      if (sid) {
        const { data: sch } = await supabase.from("schools").select("status").eq("id", sid).maybeSingle();
        schoolStatus = (sch?.status as ProfileInfo["schoolStatus"]) ?? "active";
      }
      setRole(r);
      setSchoolId(sid);
      setProfile({ status: (prof?.status as AccountStatus) ?? null, schoolStatus });
      setResolvedUserId(user.id);
      setProfileLoading(false);
    })();
    return () => { cancel = true; };
  }, [user]);

  const isProfileReady = !user || resolvedUserId === user.id;
  return {
    session,
    user,
    role: isProfileReady ? role : null,
    schoolId: isProfileReady ? schoolId : null,
    profile: isProfileReady ? profile : { status: null, schoolStatus: null },
    loading,
    profileLoading: profileLoading || !isProfileReady,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
