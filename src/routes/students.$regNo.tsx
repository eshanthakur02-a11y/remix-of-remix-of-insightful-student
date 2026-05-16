import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { students } from "@/lib/mock-data";
import { useStudent } from "@/lib/student-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Pencil, Save, X, Printer } from "lucide-react";
import { useRef, useState } from "react";
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
    if (!students.find((s) => s.regNo === params.regNo)) throw notFound();
    return { regNo: params.regNo };
  },
});

const SUBJECTS: { key: keyof ReturnType<typeof useStudent>[0] extends infer T ? any : never; label: string; max: number }[] = [
  { key: "english", label: "English", max: 100 },
  { key: "math", label: "Mathematics", max: 100 },
  { key: "science", label: "Science", max: 100 },
  { key: "ssc", label: "Social Science", max: 100 },
  { key: "python", label: "Python", max: 100 },
];

function StudentProfile() {
  const { regNo } = Route.useLoaderData();
  const [s, update] = useStudent(regNo);
  const [editing, setEditing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: s?.name ?? "",
    className: s?.className ?? "",
    rollNo: s?.rollNo ?? 0,
    attendance: s?.attendance ?? 0,
    parentName: s?.parentName ?? "",
    parentEmail: s?.parentEmail ?? "",
    guardian: s?.guardian ?? "",
    remarks: s?.remarks ?? "",
    english: s?.marks.english ?? 0,
    math: s?.marks.math ?? 0,
    science: s?.marks.science ?? 0,
    ssc: s?.marks.ssc ?? 0,
    python: s?.marks.python ?? 0,
  });

  if (!s) return null;
  const rank = [...students].sort((a, b) => b.percentage - a.percentage).findIndex((x) => x.regNo === s.regNo) + 1;

  function startEdit() {
    setForm({
      name: s!.name, className: s!.className, rollNo: s!.rollNo, attendance: s!.attendance,
      parentName: s!.parentName, parentEmail: s!.parentEmail, guardian: s!.guardian, remarks: s!.remarks,
      english: s!.marks.english, math: s!.marks.math, science: s!.marks.science, ssc: s!.marks.ssc, python: s!.marks.python,
    });
    setEditing(true);
  }

  function saveEdit() {
    const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Number(n) || 0));
    update({
      name: form.name.trim() || s!.name,
      className: form.className.trim() || s!.className,
      rollNo: Number(form.rollNo) || s!.rollNo,
      attendance: clamp(form.attendance),
      parentName: form.parentName,
      parentEmail: form.parentEmail,
      guardian: form.guardian,
      remarks: form.remarks,
      marks: {
        english: clamp(form.english),
        math: clamp(form.math),
        science: clamp(form.science),
        ssc: clamp(form.ssc),
        python: clamp(form.python),
      },
    });
    setEditing(false);
    toast.success("Report card updated");
  }

  function downloadPDF() {
    const subjectRows = [
      ["English", s!.marks.english],
      ["Mathematics", s!.marks.math],
      ["Science", s!.marks.science],
      ["Social Science", s!.marks.ssc],
      ["Python", s!.marks.python],
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Report — ${s!.name}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;padding:32px;color:#0f172a;background:#fff}
        .card{border:2px solid #1e3a8a;border-radius:14px;overflow:hidden;max-width:820px;margin:0 auto}
        .head{background:#1e3a8a;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
        .head h1{margin:0;font-size:26px;letter-spacing:1px} .head .sub{font-size:12px;opacity:.9;text-align:right}
        .section{padding:16px 24px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;font-size:13px}
        .grid b{color:#334155;font-weight:600}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
        th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}
        th{background:#eff6ff;color:#1e3a8a;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}
        .box{border:1px solid #cbd5e1;border-radius:8px;padding:10px}
        .box .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
        .box .v{font-size:18px;font-weight:700;color:#0f172a;margin-top:2px}
        .remarks{margin-top:12px;padding:12px;border-left:4px solid #1e3a8a;background:#f8fafc;font-size:13px;border-radius:0 8px 8px 0}
        .foot{display:flex;justify-content:space-between;padding:24px;font-size:12px;color:#475569;border-top:1px dashed #cbd5e1}
        h3{margin:0 0 6px;color:#1e3a8a;font-size:13px;text-transform:uppercase;letter-spacing:1px}
      </style></head><body>
      <div class="card">
        <div class="head">
          <div><h1>REPORT CARD</h1><div style="font-size:12px;margin-top:4px">Academic Year: 2024-2025</div></div>
          <div class="sub"><b>Scholaris School</b><br/>Knowledge City<br/>info@scholaris.edu</div>
        </div>
        <div class="section">
          <h3>Student Details</h3>
          <div class="grid">
            <div><b>Name:</b> ${s!.name}</div><div><b>Reg No:</b> ${s!.regNo}</div>
            <div><b>Class:</b> ${s!.className}</div><div><b>Roll No:</b> ${s!.rollNo}</div>
            <div><b>Guardian:</b> ${s!.parentName} (${s!.guardian})</div><div><b>Email:</b> ${s!.parentEmail}</div>
          </div>
        </div>
        <div class="section">
          <h3>Marks Obtained</h3>
          <table>
            <thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Grade</th></tr></thead>
            <tbody>
              ${subjectRows.map(([n, m]) => `<tr><td>${n}</td><td>${m}</td><td>100</td><td>${grade(Number(m))}</td></tr>`).join("")}
            </tbody>
          </table>
          <div class="summary">
            <div class="box"><div class="l">Total</div><div class="v">${s!.total}/500</div></div>
            <div class="box"><div class="l">Percentage</div><div class="v">${s!.percentage}%</div></div>
            <div class="box"><div class="l">Grade</div><div class="v">${s!.grade}</div></div>
            <div class="box"><div class="l">Attendance</div><div class="v">${s!.attendance}%</div></div>
          </div>
          <div class="remarks"><b>Remarks:</b> ${s!.remarks}</div>
        </div>
        <div class="foot">
          <div>Date: ${new Date().toLocaleDateString()}</div>
          <div>Class Teacher · Principal · Parent</div>
        </div>
      </div>
      <script>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    toast.success("Report opened — use Print → Save as PDF");
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>
        <div className="flex gap-2 flex-wrap">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
              <Button onClick={saveEdit}><Save className="h-4 w-4 mr-2" />Save changes</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startEdit}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
              <Button onClick={downloadPDF}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
            </>
          )}
        </div>
      </div>

      <div ref={cardRef} className="glass-card overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide">REPORT CARD</h1>
            <p className="text-xs md:text-sm opacity-90 mt-1">Academic Year 2024 – 2025</p>
          </div>
          <div className="text-right text-xs md:text-sm opacity-90">
            <div className="font-semibold">Scholaris School</div>
            <div>Knowledge City</div>
            <div>info@scholaris.edu</div>
          </div>
        </div>

        {/* Student details */}
        <div className="p-6 border-b border-border">
          <SectionTitle>Student Details</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" editing={editing} value={form.name} onChange={(v) => setForm({ ...form, name: v })} display={s.name} />
            <Field label="Reg No" editing={false} value={s.regNo} display={s.regNo} />
            <Field label="Class" editing={editing} value={form.className} onChange={(v) => setForm({ ...form, className: v })} display={s.className} />
            <Field label="Roll No" editing={editing} type="number" value={String(form.rollNo)} onChange={(v) => setForm({ ...form, rollNo: Number(v) })} display={String(s.rollNo)} />
            <Field label="Guardian name" editing={editing} value={form.parentName} onChange={(v) => setForm({ ...form, parentName: v })} display={s.parentName} />
            <Field label="Relation" editing={editing} value={form.guardian} onChange={(v) => setForm({ ...form, guardian: v })} display={s.guardian} />
            <Field label="Parent email" editing={editing} value={form.parentEmail} onChange={(v) => setForm({ ...form, parentEmail: v })} display={s.parentEmail} />
            <Field label="Attendance %" editing={editing} type="number" value={String(form.attendance)} onChange={(v) => setForm({ ...form, attendance: Number(v) })} display={`${s.attendance}%`} />
          </div>
        </div>

        {/* Marks */}
        <div className="p-6 border-b border-border">
          <SectionTitle>Marks Obtained</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Subject</th>
                  <th className="text-left font-medium px-4 py-3">Marks</th>
                  <th className="text-left font-medium px-4 py-3">Max</th>
                  <th className="text-left font-medium px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map((sub) => {
                  const key = sub.key as "english" | "math" | "science" | "ssc" | "python";
                  const val = editing ? form[key] : s.marks[key];
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{sub.label}</td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <Input type="number" min={0} max={100} className="w-24 bg-background/40"
                            value={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) } as any)} />
                        ) : (
                          <span className="tabular-nums">{s.marks[key]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">100</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={badgeClass(grade(val))}>{grade(val)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Stat label="Total" value={`${s.total}/500`} />
            <Stat label="Percentage" value={`${s.percentage}%`} />
            <Stat label="Overall grade" value={s.grade} />
            <Stat label="Class rank" value={`#${rank}`} />
          </div>
        </div>

        {/* Remarks */}
        <div className="p-6">
          <SectionTitle>Remarks</SectionTitle>
          {editing ? (
            <Textarea rows={3} className="bg-background/40"
              value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          ) : (
            <div className="border-l-4 border-primary bg-card/40 rounded-r-lg p-4 text-sm">{s.remarks}</div>
          )}

          <div className="flex justify-between text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Class Teacher · Principal · Parent / Guardian</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{children}</div>;
}

function Field({ label, value, display, editing, onChange, type = "text" }: {
  label: string; value: string; display: string; editing: boolean;
  onChange?: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing && onChange ? (
        <Input type={type} className="mt-1 bg-background/40" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="mt-1 text-sm font-medium">{display}</div>
      )}
    </div>
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

function grade(p: number) {
  return p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "F";
}
function badgeClass(g: string) {
  if (g === "F") return "bg-destructive/15 text-destructive border-destructive/30";
  if (g.startsWith("A")) return "bg-success/15 text-success border-success/30";
  return "bg-card/60";
}
