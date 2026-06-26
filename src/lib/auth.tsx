import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "super_admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "accountant"
  | "transport";

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "School Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant",
  transport: "Transport Manager",
};

export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/superadmin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
  accountant: "/accountant",
  transport: "/transport",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (!user) { setRole(null); setSchoolId(null); return; }
    let cancel = false;
    (async () => {
      const [{ data: roleRow }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role,school_id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
      ]);
      if (cancel) return;
      setRole((roleRow?.role as AppRole) ?? null);
      setSchoolId((prof?.school_id as string | null) ?? (roleRow?.school_id as string | null) ?? null);
    })();
    return () => { cancel = true; };
  }, [user]);

  return { session, user, role, schoolId, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
