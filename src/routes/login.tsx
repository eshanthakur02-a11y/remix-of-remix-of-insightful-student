import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ROLE_HOME, useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Scholaris" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, profile, loading, profileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already-logged-in guard: never show the form for an active, valid session.
  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) return;
    // Suspension check (skipped for super_admin)
    if (role !== "super_admin") {
      if (profile.status === "suspended" || profile.schoolStatus === "suspended") {
        toast.error("Your account or school has been suspended. Contact your administrator.");
        supabase.auth.signOut();
        return;
      }
    }
    if (role) navigate({ to: ROLE_HOME[role] });
    else navigate({ to: "/no-role" });
  }, [user, role, profile, loading, profileLoading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setSubmitting(false); return toast.error(error.message); }

    // Resolve role + suspension state before redirecting.
    const uid = data.user?.id;
    if (!uid) { setSubmitting(false); return; }
    const [{ data: roleRow }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role,school_id").eq("user_id", uid).limit(1).maybeSingle(),
      supabase.from("profiles").select("school_id,status").eq("id", uid).maybeSingle(),
    ]);
    const r = (roleRow?.role as AppRole) ?? null;
    const sid = (prof?.school_id as string | null) ?? null;
    if (r !== "super_admin") {
      if (prof?.status === "suspended") {
        await supabase.auth.signOut();
        setSubmitting(false);
        return toast.error("Your account has been suspended. Contact your administrator.");
      }
      if (sid) {
        const { data: sch } = await supabase.from("schools").select("status").eq("id", sid).maybeSingle();
        if (sch?.status === "suspended") {
          await supabase.auth.signOut();
          setSubmitting(false);
          return toast.error("Your school has been suspended. Contact your administrator.");
        }
      }
    }
    // Best-effort last_login stamp
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", uid);

    setSubmitting(false);
    toast.success("Welcome back");
    if (!r) navigate({ to: "/no-role" });
    else navigate({ to: ROLE_HOME[r] });
  }

  // Hide form while we resolve an existing session.
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-xs text-muted-foreground">School Management System</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center mt-6">
          Accounts are provisioned by your school administrator.
        </p>
      </div>
    </div>
  );
}
