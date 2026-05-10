import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { aiInsights, students } from "@/lib/mock-data";
import { Sparkles, AlertTriangle, TrendingDown, Lightbulb, Target } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

function Insights() {
  const atRisk = students.filter((s) => s.percentage < 55 || s.attendance < 70).slice(0, 6);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" /> AI Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Predictions, risk detection, and personalized recommendations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiInsights.map((i) => (
          <div key={i.title} className="glass-card p-5 relative overflow-hidden animate-fade-up">
            <div className={`absolute -top-12 -right-12 h-36 w-36 rounded-full blur-2xl ${
              i.tone === "alert" ? "bg-destructive/30" : i.tone === "warning" ? "bg-warning/30" : i.tone === "success" ? "bg-success/30" : "bg-primary/30"
            }`} />
            <div className="relative flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-card/60 border border-border">
                {i.tone === "alert" ? <AlertTriangle className="h-4 w-4 text-destructive" />
                  : i.tone === "warning" ? <TrendingDown className="h-4 w-4 text-warning" />
                  : i.tone === "success" ? <Target className="h-4 w-4 text-success" />
                  : <Lightbulb className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">{i.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{i.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5 mt-6 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Predicted at-risk students</h3>
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">{atRisk.length} flagged</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {atRisk.map((s) => (
            <div key={s.regNo} className="rounded-xl border border-border bg-card/40 p-4 flex items-center gap-3">
              <Avatar name={s.name} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">Class {s.className} · Att {s.attendance}% · {s.percentage}%</div>
              </div>
              <Badge className="bg-destructive/15 text-destructive border-destructive/30" variant="outline">Risk</Badge>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
