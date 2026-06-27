import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/no-role")({
  component: NoRole,
  head: () => ({ meta: [{ title: "No role assigned — Scholaris" }] }),
});

function NoRole() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">No role assigned</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your account is signed in, but no role has been assigned yet. Please contact your
          school administrator (or the Scholaris super admin) to grant you access.
        </p>
        <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
      </div>
    </div>
  );
}
