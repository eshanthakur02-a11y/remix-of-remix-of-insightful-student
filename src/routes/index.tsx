import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ROLE_HOME, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (role) navigate({ to: ROLE_HOME[role] });
  }, [user, role, loading, navigate]);

  if (!loading && user && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md text-center">
          <h1 className="text-lg font-semibold mb-2">No role assigned</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to a role yet. Ask your school admin to grant you access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your dashboard…
    </div>
  );
}
