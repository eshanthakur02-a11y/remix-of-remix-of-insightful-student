import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <RoleShell role="admin" navItems={adminNav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage the entire school — pick a module below.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminNav.filter((n) => n.to !== "/admin").map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="glass-card p-5 hover:border-primary/40 transition-colors group">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{label}</h3>
            <p className="text-xs text-muted-foreground">Open module →</p>
          </Link>
        ))}
      </div>
    </RoleShell>
  );
}
