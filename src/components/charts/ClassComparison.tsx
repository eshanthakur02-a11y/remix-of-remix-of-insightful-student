import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { students } from "@/lib/mock-data";

export function ClassComparison() {
  const byClass = new Map<string, { className: string; avgMarks: number; avgAttendance: number; count: number; sumM: number; sumA: number }>();
  for (const s of students) {
    const e = byClass.get(s.className) ?? { className: s.className, avgMarks: 0, avgAttendance: 0, count: 0, sumM: 0, sumA: 0 };
    e.count++; e.sumM += s.percentage; e.sumA += s.attendance;
    byClass.set(s.className, e);
  }
  const data = Array.from(byClass.values())
    .map((e) => ({ className: `Class ${e.className}`, avgMarks: Math.round(e.sumM / e.count), avgAttendance: Math.round(e.sumA / e.count) }))
    .sort((a, b) => a.className.localeCompare(b.className));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="className" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="avgMarks" name="Avg marks %" fill="var(--color-primary)" radius={[8, 8, 0, 0]} barSize={28} />
        <Line type="monotone" dataKey="avgAttendance" name="Avg attendance %" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
