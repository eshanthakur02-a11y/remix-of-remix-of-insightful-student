import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => toast.error(err.message || "Chat failed"),
  });

  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, loading]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage({ text });
    setInput("");
  }

  function renderText(m: UIMessage) {
    return m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null));
  }

  return (
    <>
      {/* Launcher (left side) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Scholaris AI chat"
        className="fixed left-5 bottom-5 z-50 h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant, 0 10px 30px -10px rgba(0,0,0,.4))" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed left-5 bottom-24 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[540px] max-h-[calc(100vh-7rem)] glass-card border border-border rounded-2xl flex flex-col overflow-hidden animate-fade-up">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/40">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Scholaris AI</div>
              <div className="text-xs text-muted-foreground">Ask about students, classes, trends</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Hi Anita — I'm your dashboard assistant. Try:</p>
                <ul className="space-y-1.5">
                  {[
                    "Which class has the lowest attendance?",
                    "Summarize top performers this term",
                    "Draft a parent note for low attendance",
                  ].map((q) => (
                    <li key={q}>
                      <button
                        onClick={() => sendMessage({ text: q })}
                        className="text-left text-foreground hover:text-primary text-xs px-3 py-2 rounded-lg bg-card/60 border border-border w-full transition-colors"
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
                    {renderText(m)}
                  </div>
                ) : (
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {renderText(m)}
                  </div>
                )}
              </div>
            ))}

            {status === "submitted" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-3 bg-card/40">
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
                className="flex-1 resize-none bg-background/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
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
