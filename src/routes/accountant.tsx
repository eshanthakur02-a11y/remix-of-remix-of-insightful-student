import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, Wallet, Receipt, AlertCircle, Award, FileBarChart,
} from "lucide-react";
import { RoleShell, FeatureGrid, type NavItem } from "@/components/RoleShell";

export const Route = createFileRoute("/accountant")({ component: AccountantPage });

const items = [
  { title: "Dashboard", description: "Daily fee collection summary.", icon: LayoutDashboard },
  { title: "Collect Fees", description: "Record fee payments for students.", icon: Wallet },
  { title: "Generate Receipts", description: "Print and email payment receipts.", icon: Receipt },
  { title: "Pending Fees", description: "Track dues with late-fee and due dates.", icon: AlertCircle },
  { title: "Scholarships", description: "Manage scholarships and waivers.", icon: Award },
  { title: "Monthly Reports", description: "Generate monthly financial reports.", icon: FileBarChart },
];

const nav: NavItem[] = items.map((i) => ({ to: "/accountant", label: i.title, icon: i.icon }));

function AccountantPage() {
  return (
    <RoleShell role="accountant" navItems={nav}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Accountant Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage fees, receipts, and financial reports.</p>
      </div>
      <FeatureGrid items={items} />
    </RoleShell>
  );
}
