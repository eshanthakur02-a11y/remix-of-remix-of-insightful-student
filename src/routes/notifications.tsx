import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({ component: Page });

type N = { id: string; title: string; body: string | null; kind: string; read_at: string | null; created_at: string };

const KINDS = ["all", "attendance", "homework", "exam", "fee", "announcement", "library", "transport", "system"];

function Page() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("notifications").select("id,title,body,kind,read_at,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (kind !== "all") q = q.eq("kind", kind);
    if (view === "unread") q = q.is("read_at", null);
    const { data } = await q;
    setItems((data ?? []) as N[]); setLoading(false);
  }, [user, kind, view]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif-page:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
  }
  async function markUnread(id: string) {
    await supabase.from("notifications").update({ read_at: null }).eq("id", id);
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, read_at: null } : x));
  }
  async function remove(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }
  async function markAll() {
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) return toast.error(error.message);
    toast.success("All marked read"); load();
  }

  return (
    <>
      <PageHeader title="Notifications" description="Realtime alerts across attendance, homework, fees, exams and more."
        actions={<Button size="sm" variant="outline" onClick={markAll}><Check className="h-4 w-4 mr-1" /> Mark all read</Button>}
      />
      <div className="flex gap-2 items-center mb-3">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={view} onValueChange={(v: "all" | "unread") => setView(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="glass-card divide-y divide-border">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : items.map((n) => (
          <div key={n.id} className={`p-4 flex gap-3 items-start hover:bg-card/30 transition-colors ${!n.read_at ? "bg-primary/5" : ""}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium truncate">{n.title}</div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
              <div className="mt-1.5 flex gap-2 items-center">
                <Badge variant="outline" className="text-[10px] uppercase">{n.kind}</Badge>
                {n.read_at ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markUnread(n.id)}>Mark unread</Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRead(n.id)}>Mark read</Button>
                )}
                <Button size="sm" variant="ghost" className="h-7" onClick={() => remove(n.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
