import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning" | "destructive";
}) {
  const toneBg: Record<string, string> = {
    primary: "from-primary/30 to-primary/5",
    accent: "from-accent/30 to-accent/5",
    success: "from-success/30 to-success/5",
    warning: "from-warning/30 to-warning/5",
    destructive: "from-destructive/30 to-destructive/5",
  };
  const toneText: Record<string, string> = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="glass-card p-5 relative overflow-hidden animate-fade-up">
      <div className={`absolute -top-12 -right-12 h-36 w-36 rounded-full blur-2xl bg-gradient-to-br ${toneBg[tone]}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
          {typeof delta === "number" && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs ${positive ? "text-success" : "text-destructive"}`}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}% vs last month
            </div>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-card/60 border border-border ${toneText[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
