import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Msg = { id: string; role: "user" | "assistant"; text: string };

function extractReply(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const candidate =
      d.reply ?? d.message ?? d.text ?? d.output ?? d.answer ?? d.response;
    if (typeof candidate === "string") return candidate;
    if (Array.isArray(data) && data.length > 0) return extractReply(data[0]);
    return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  }
  return String(data ?? "");
}

import { useAuth } from "@/lib/auth";

export function ChatBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (!user) return null;


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/n8n-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const raw = await res.text();
      let parsed: unknown = raw;
      try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
      if (!res.ok) throw new Error(`Webhook ${res.status}`);

      // Broadcast for any dashboard widget that wants to react
      window.dispatchEvent(new CustomEvent("scholaris:n8n-update", { detail: parsed }));

      const reply = extractReply(parsed);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      toast.error(msg);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    send(input);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Scholaris AI chat"
        className="fixed left-5 bottom-5 z-50 h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant, 0 10px 30px -10px rgba(0,0,0,.4))" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed left-5 bottom-24 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-7rem)] bg-card border border-border rounded-2xl flex flex-col overflow-hidden animate-fade-up shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Scholaris AI</div>
              <div className="text-xs text-muted-foreground">Connected to n8n workflow</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Hi Anita — ask me anything. Try:</p>
                <ul className="space-y-1.5">
                  {[
                    "Refresh student data",
                    "Which class has the lowest attendance?",
                    "Send parent notes for low attendance",
                  ].map((q) => (
                    <li key={q}>
                      <button
                        onClick={() => send(q)}
                        className="text-left text-foreground hover:text-primary hover:border-primary/40 text-xs px-3 py-2 rounded-lg bg-card border border-border w-full transition-colors"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm bg-primary text-primary-foreground">
                    {m.text}
                  </div>
                ) : (
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-3 bg-card">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask anything about your dashboard…"
                className="flex-1 resize-none bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
