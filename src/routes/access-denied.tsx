import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ROLE_HOME, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/access-denied")({
  component: AccessDenied,
  head: () => ({ meta: [{ title: "Access denied — Scholaris" }] }),
});

function AccessDenied() {
  const { role } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to view that page.
        </p>
        <Button onClick={() => navigate({ to: role ? ROLE_HOME[role] : "/login" })}>
          Back to my dashboard
        </Button>
      </div>
    </div>
  );
}
