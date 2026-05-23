import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_HOME } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/messages")({ component: Page });

function Page() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [messages, setMessages] = useState<{ id: string; sender_id: string; recipient_id: string; body: string; created_at: string }[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id,full_name").neq("id", user.id).order("full_name").then(({ data }) => setPeople(data ?? []));
  }, [user]);

  async function load() {
    if (!user || !selected) return;
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selected}),and(sender_id.eq.${selected},recipient_id.eq.${user.id})`)
      .order("created_at");
    setMessages(data ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [selected, user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, selected]); // eslint-disable-line

  async function send() {
    if (!user || !selected || !body.trim()) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: selected, body: body.trim() });
    if (error) toast.error(error.message); else { setBody(""); load(); }
  }

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  const home = role ? ROLE_HOME[role] : "/";

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Link to={home}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="font-semibold">Messages</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {people.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 text-sm hover:bg-muted/40 ${selected === p.id ? "bg-muted/60" : ""}`}>
              {p.full_name || "Unnamed"}
            </button>
          ))}
          {people.length === 0 && <div className="p-4 text-sm text-muted-foreground">No contacts yet.</div>}
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10" /><div>Select a contact to chat</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-md px-4 py-2 rounded-2xl text-sm ${m.sender_id === user.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Label className="sr-only">Message</Label>
              <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message" />
              <Button onClick={send}>Send</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
