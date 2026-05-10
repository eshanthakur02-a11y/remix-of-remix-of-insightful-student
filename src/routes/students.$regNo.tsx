import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getStudent, students } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail, Sparkles, Trophy, AlertTriangle, CalendarCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/students/$regNo")({
  component: StudentProfile,
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold">Student not found</h1>
        <Link to="/students" className="text-primary mt-4 inline-block">Back to students</Link>
      </div>
    </AppShell>
  ),
  loader: ({ params }) => {
    const s = getStudent(params.regNo);
    if (!s) throw notFound();
    return s;
  },
});

function StudentProfile() {
  const s = Route.useLoaderData();
  const rank = [...students].sort((a, b) => b.percentage - a.percentage).findIndex((x) => x.regNo === s.regNo) + 1;
  const subjectData: { subject: string; score: number }[] = Object.entries(s.marks).map(([k, v]) => ({ subject: k.charAt(0).toUpperCase() + k.slice(1), score: v as number }));
  const strengths = subjectData.filter((d) => d.score >= 75).map((d) => d.subject);
  const weaknesses = subjectData.filter((d) => d.score < 60).map((d) => d.subject);

  function downloadPDF() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Report — ${s.name}</title>
      <style>body{font-family:Inter,Arial;padding:40px;color:#0f172a}h1{margin:0}small{color:#64748b}
      .row{display:flex;gap:24px;margin-top:16px}.box{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
      table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #e2e8f0;text-align:left;padding:8px}</style>
      </head><body>
      <h1>${s.name}</h1><small>${s.regNo} · Roll ${s.rollNo} · Class ${s.className}</small>
      <div class="row"><div class="box"><b>Attendance:</b> ${s.attendance}%</div>
      <div class="box"><b>Total:</b> ${s.total}/500</div><div class="box"><b>Percentage:</b> ${s.percentage}%</div>
      <div class="box"><b>Grade:</b> ${s.grade}</div></div>
      <h3>Subject scores</h3><table><tr><th>Subject</th><th>Marks</th></tr>
      ${subjectData.map((d) => `<tr><td>${d.subject}</td><td>${d.score}</td></tr>`).join("")}</table>
      <h3>AI Remarks</h3><p>${s.remarks}</p>
      <h3>Parent</h3><p>${s.parentName} (${s.guardian}) — ${s.parentEmail}</p>
      <script>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    toast.success("Report opened — use Print → Save as PDF");
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Email sent to parent (demo)")}><Mail className="h-4 w-4 mr-2" />Email parent</Button>
          <Button onClick={downloadPDF}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-6 lg:col-span-1 animate-fade-up">
          <div className="flex items-center gap-4">
            <Avatar name={s.name} className="h-16 w-16 rounded-2xl text-base" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{s.name}</h2>
              <p className="text-sm text-muted-foreground">{s.regNo} · Roll {s.rollNo}</p>
              <Badge variant="outline" className="mt-2">Class {s.className}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Stat label="Attendance" value={`${s.attendance}%`} />
            <Stat label="Percentage" value={`${s.percentage}%`} />
            <Stat label="Grade" value={s.grade} />
            <Stat label="Class rank" value={`#${rank}`} />
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Parent / Guardian</div>
            <div className="text-sm font-medium">{s.parentName}</div>
            <div className="text-xs text-muted-foreground">{s.guardian} · {s.parentEmail}</div>
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2 animate-fade-up">
          <h3 className="font-semibold mb-4">Subject scores</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="subject" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {subjectData.map((d, i) => (
                  <Cell key={i} fill={d.score >= 75 ? "var(--color-success)" : d.score >= 60 ? "var(--color-primary)" : "var(--color-destructive)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="glass-card p-6 animate-fade-up">
          <h3 className="font-semibold mb-4">Skill profile</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={subjectData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--color-muted-foreground)" fontSize={11} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 lg:col-span-2 animate-fade-up relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl bg-gradient-to-br from-accent/30 to-primary/20" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="font-semibold">AI-generated remarks</h3>
            </div>
            <p className="text-sm text-muted-foreground">{s.remarks}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-center gap-2 text-success font-medium text-sm"><Trophy className="h-4 w-4" /> Strengths</div>
                <div className="mt-2 text-sm">
                  {strengths.length ? strengths.join(", ") : "Building foundations across subjects."}
                </div>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex items-center gap-2 text-warning font-medium text-sm"><AlertTriangle className="h-4 w-4" /> Focus areas</div>
                <div className="mt-2 text-sm">
                  {weaknesses.length ? weaknesses.join(", ") : "No weak subjects detected."}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><CalendarCheck className="h-4 w-4 text-primary" /> Parent summary</div>
              <p className="text-sm text-muted-foreground mt-2">
                {s.name} maintained {s.attendance}% attendance with an overall {s.percentage}% (Grade {s.grade}).
                We recommend a 20-minute daily revision plan focused on {weaknesses[0] ?? "balanced practice"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
