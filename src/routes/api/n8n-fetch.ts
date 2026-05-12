import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://admin3114.app.n8n.cloud/webhook-test/10527fa1-676c-4d14-b36a-8b7d19adee53";

export const Route = createFileRoute("/api/n8n-fetch")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(WEBHOOK_URL, { method: "POST" });
          const text = await res.text();
          return new Response(text, {
            status: res.status,
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "application/json",
            },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Fetch failed" }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
