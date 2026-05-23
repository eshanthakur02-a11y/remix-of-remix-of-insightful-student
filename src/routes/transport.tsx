import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Route as RouteIcon, Users, UserCog, Clock } from "lucide-react";
import { RoleShell, FeatureGrid, type NavItem } from "@/components/RoleShell";

export const Route = createFileRoute("/transport")({ component: TransportPage });

const items = [
  { title: "Transport Dashboard", description: "Live overview of fleet and routes.", icon: LayoutDashboard },
  { title: "Bus Routes", description: "Add and edit bus routes and stops.", icon: RouteIcon },
  { title: "Assign Students", description: "Map students to buses and stops.", icon: Users },
  { title: "Manage Drivers", description: "Driver profiles, licenses, and shifts.", icon: UserCog },
  { title: "Pickup & Drop Timing", description: "Track real-time pickup and drop times.", icon: Clock },
];

const nav: NavItem[] = items.map((i) => ({ to: "/transport", label: i.title, icon: i.icon }));

function TransportPage() {
  return (
    <RoleShell role="transport" navItems={nav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transport Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">Routes, buses, drivers — all in one place.</p>
      </div>
      <FeatureGrid items={items} />
    </RoleShell>
  );
}
