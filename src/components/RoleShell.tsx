import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, signOut, useAuth, type AppRole } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

export type NavItem = { to: string; label: string; icon: LucideIcon; group?: string };

export function RoleShell({
  role,
  navItems,
  children,
}: {
  role: AppRole;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role: currentRole, schoolId, profile, loading, profileLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (profileLoading) return;
    if (!currentRole) { navigate({ to: "/no-role" }); return; }
    if (currentRole !== "super_admin" && (profile.status === "suspended" || profile.schoolStatus === "suspended")) {
      navigate({ to: "/access-denied" });
      return;
    }
    if (currentRole !== role) navigate({ to: "/access-denied" });
  }, [user, currentRole, profile, loading, profileLoading, role, navigate]);

  useEffect(() => {
    if (!user || currentRole === "super_admin" || !schoolId) return;
    supabase.from("schools").select("status").eq("id", schoolId).maybeSingle().then(({ data }) => {
      if (data?.status === "suspended") signOut();
    });
  }, [location.pathname, user, currentRole, schoolId]);

  // close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const it of navItems) {
      const g = it.group ?? "Main";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    }
    return Array.from(map.entries());
  }, [navItems]);

  if (loading || profileLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  const NavList = () => (
    <nav className="flex flex-col gap-4 overflow-y-auto">
      {groups.map(([group, items]) => (
        <div key={group}>
          <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
            {group}
          </div>
          <div className="flex flex-col gap-0.5">
            {items.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to + label}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2 px-2 mb-6">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold tracking-tight truncate">Scholaris</div>
        <div className="text-xs text-muted-foreground truncate">{ROLE_LABEL[role]}</div>
      </div>
    </div>
  );

  const Footer = () => (
    <div className="mt-auto pt-4">
      <div className="text-xs text-muted-foreground truncate mb-2">{user.email}</div>
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl px-4 py-6 sticky top-0 h-screen">
        <Brand />
        <NavList />
        <Footer />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-4 backdrop-blur-xl bg-background/40 border-b border-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 flex flex-col">
              <Brand />
              <NavList />
              <Footer />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-semibold text-sm truncate">{ROLE_LABEL[role]}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function FeatureGrid({ items }: { items: { title: string; description: string; icon: LucideIcon }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ title, description, icon: Icon }) => (
        <div key={title} className="glass-card p-5 hover:border-primary/40 transition-colors">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">Coming soon</div>
        </div>
      ))}
    </div>
  );
}
