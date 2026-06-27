import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}) {
  const { user, role, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (profileLoading) return;
    if (!role) { navigate({ to: "/no-role" }); return; }
    if (role !== "super_admin" && (profile.status === "suspended" || profile.schoolStatus === "suspended")) {
      navigate({ to: "/access-denied" });
      return;
    }
    if (!allowedRoles.includes(role)) navigate({ to: "/access-denied" });
  }, [user, role, profile, loading, profileLoading, allowedRoles, navigate]);

  if (loading || profileLoading || !user || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
