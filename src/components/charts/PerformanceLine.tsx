import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { monthlyPerformance } from "@/lib/mock-data";

export function PerformanceLine() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={monthlyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
        <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="avg" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 3 }} name="Class avg" />
        <Line type="monotone" dataKey="top" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={{ r: 3 }} name="Top score" />
      </LineChart>
    </ResponsiveContainer>
  );
}
