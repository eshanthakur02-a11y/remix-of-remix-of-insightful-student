import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { students } from "@/lib/mock-data";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Avatar } from "@/components/Avatar";
import { Search } from "lucide-react";

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string>("all");
  const [minAtt, setMinAtt] = useState(0);
  const [minMarks, setMinMarks] = useState(0);

  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.className))).sort(), []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return students.filter((s) =>
      (cls === "all" || s.className === cls) &&
      s.attendance >= minAtt &&
      s.percentage >= minMarks &&
      (q === "" ||
        s.name.toLowerCase().includes(ql) ||
        s.regNo.toLowerCase().includes(ql) ||
        String(s.rollNo).includes(ql))
    );
  }, [q, cls, minAtt, minMarks]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} of {students.length} students</p>
        </div>
      </div>

      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, roll, reg no…" className="pl-9 bg-background/40" />
        </div>
        <div className="md:col-span-2">
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="bg-background/40"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <div className="text-xs text-muted-foreground mb-1.5">Min attendance: {minAtt}%</div>
          <Slider value={[minAtt]} onValueChange={(v) => setMinAtt(v[0])} max={100} step={1} />
        </div>
        <div className="md:col-span-3">
          <div className="text-xs text-muted-foreground mb-1.5">Min marks: {minMarks}%</div>
          <Slider value={[minMarks]} onValueChange={(v) => setMinMarks(v[0])} max={100} step={1} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Student</th>
                <th className="text-left font-medium px-4 py-3">Reg / Roll</th>
                <th className="text-left font-medium px-4 py-3">Class</th>
                <th className="text-left font-medium px-4 py-3">Attendance</th>
                <th className="text-left font-medium px-4 py-3">Total</th>
                <th className="text-left font-medium px-4 py-3">%</th>
                <th className="text-left font-medium px-4 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.regNo} className="border-t border-border hover:bg-card/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/students/$regNo" params={{ regNo: s.regNo }} className="flex items-center gap-3 hover:text-primary">
                      <Avatar name={s.name} className="h-8 w-8" />
                      <span className="font-medium">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{s.regNo}</div>
                    <div className="text-xs">Roll {s.rollNo}</div>
                  </td>
                  <td className="px-4 py-3">{s.className}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.attendance}%`,
                            background: s.attendance < 75 ? "var(--color-destructive)" : "var(--gradient-primary)",
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-xs">{s.attendance}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{s.total}</td>
                  <td className="px-4 py-3 tabular-nums">{s.percentage}%</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        s.grade === "F" ? "bg-destructive/15 text-destructive border-destructive/30"
                        : s.grade.startsWith("A") ? "bg-success/15 text-success border-success/30"
                        : "bg-card/60"
                      }
                      variant="outline"
                    >
                      {s.grade}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No students match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
