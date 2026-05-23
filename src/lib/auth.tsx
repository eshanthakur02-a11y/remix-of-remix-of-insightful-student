import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "teacher" | "student" | "accountant" | "transport";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  accountant: "Accountant",
  transport: "Transport Manager",
};

export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  accountant: "/accountant",
  transport: "/transport",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
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
    if (!user) { setRole(null); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!cancel) setRole((data?.role as AppRole) ?? null);
    })();
    return () => { cancel = true; };
  }, [user]);

  return { session, user, role, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
