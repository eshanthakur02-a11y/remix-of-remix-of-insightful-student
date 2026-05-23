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

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your dashboard…
    </div>
  );
}
