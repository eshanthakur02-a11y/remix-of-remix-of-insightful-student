import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { notifications } from "@/lib/mock-data";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Alerts pushed by n8n workflows in real time.</p>
      </div>

      <div className="glass-card divide-y divide-border">
        {notifications.map((n) => (
          <div key={n.id} className="p-4 flex gap-4 items-start hover:bg-card/30 transition-colors">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                n.type === "alert" ? "bg-destructive" :
                n.type === "warning" ? "bg-warning" :
                n.type === "success" ? "bg-success" : "bg-primary"
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{n.title}</div>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
