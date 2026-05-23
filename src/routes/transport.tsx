import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { transportNav } from "@/lib/nav";

export const Route = createFileRoute("/transport")({ component: Page });

function Page() {
  return (
    <RoleShell role="transport" navItems={transportNav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transport Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage routes and student assignments.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {transportNav.filter((n) => n.to !== "/transport").map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="glass-card p-5 hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold">{label}</h3>
          </Link>
        ))}
      </div>
    </RoleShell>
  );
}
