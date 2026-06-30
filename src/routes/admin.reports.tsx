import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileBarChart, Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV } from "@/lib/csv-export";
import { TableSkeleton } from "@/components/TableSkeleton";

export const Route = createFileRoute("/admin/reports")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Reports" description="Export attendance, academic, fees and people reports." />
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="summary">School Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance"><AttendanceReport /></TabsContent>
        <TabsContent value="academic"><AcademicReport /></TabsContent>
        <TabsContent value="fees"><FeesReport /></TabsContent>
        <TabsContent value="people"><PeopleReport /></TabsContent>
        <TabsContent value="summary"><SummaryReport /></TabsContent>
      </Tabs>
    </>
  );
}

function Toolbar({ name, rows, columns }: { name: string; rows: any[]; columns: { key: string; label: string }[] }) {
  return (
    <div className="flex gap-2 justify-end mb-3">
      <Button size="sm" variant="outline" onClick={() => exportCSV(name, rows, columns)} disabled={rows.length === 0}><Download className="h-4 w-4 mr-1" /> CSV</Button>
      <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print / PDF</Button>
    </div>
  );
}

function AttendanceReport() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const { data } = await supabase.from("attendance").select("status,students(full_name,admission_no,classes(name))").gte("date", from).lte("date", to).limit(5000);
    const agg: Record<string, { name: string; adm: string; cls: string; present: number; absent: number; late: number; leave: number; total: number }> = {};
    (data ?? []).forEach((r: any) => {
      const key = r.students?.full_name ?? "—";
      const o = agg[key] ?? { name: key, adm: r.students?.admission_no ?? "", cls: r.students?.classes?.name ?? "", present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      o[r.status as "present"]++; o.total++; agg[key] = o;
    });
    setRows(Object.values(agg).map((r) => ({ ...r, rate: r.total ? Math.round((r.present / r.total) * 100) : 0 })));
    setLoading(false);
  }
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="glass-card p-4 grid sm:grid-cols-4 gap-3 mb-3">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={run} className="w-full">Run</Button></div>
      </div>
      <Toolbar name="attendance-report" rows={rows} columns={[
        { key: "adm", label: "Adm" }, { key: "name", label: "Name" }, { key: "cls", label: "Class" },
        { key: "present", label: "Present" }, { key: "absent", label: "Absent" }, { key: "late", label: "Late" }, { key: "leave", label: "Leave" }, { key: "total", label: "Total" }, { key: "rate", label: "Rate %" },
      ]} />
      <ReportTable loading={loading} rows={rows} cols={["adm", "name", "cls", "present", "absent", "late", "leave", "total", "rate"]} headers={["Adm", "Name", "Class", "P", "A", "L", "Lv", "Total", "%"]} />
    </>
  );
}

function AcademicReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("exam_results").select("marks,max_marks,students(full_name,admission_no,classes(name)),subjects(name),exams(name)").limit(5000);
      setRows((data ?? []).map((r: any) => ({
        student: r.students?.full_name, adm: r.students?.admission_no, cls: r.students?.classes?.name,
        subject: r.subjects?.name, exam: r.exams?.name, marks: r.marks, max: r.max_marks,
        pct: r.max_marks ? Math.round((r.marks / r.max_marks) * 100) : 0,
      })));
      setLoading(false);
    })();
  }, []);
  return (
    <>
      <Toolbar name="academic-report" rows={rows} columns={[
        { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "cls", label: "Class" },
        { key: "exam", label: "Exam" }, { key: "subject", label: "Subject" }, { key: "marks", label: "Marks" }, { key: "max", label: "Max" }, { key: "pct", label: "%" },
      ]} />
      <ReportTable loading={loading} rows={rows} cols={["adm", "student", "cls", "exam", "subject", "marks", "max", "pct"]} headers={["Adm", "Student", "Class", "Exam", "Subject", "Marks", "Max", "%"]} />
    </>
  );
}

function FeesReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("fee_invoices").select("title,amount,discount,fine,paid,status,due_date,students(full_name,admission_no)");
      setRows((data ?? []).map((r: any) => ({
        adm: r.students?.admission_no, student: r.students?.full_name,
        title: r.title, amount: r.amount, discount: r.discount, fine: r.fine, paid: r.paid,
        balance: Number(r.amount) - Number(r.discount) + Number(r.fine) - Number(r.paid),
        due: r.due_date, status: r.status,
      })));
      setLoading(false);
    })();
  }, []);
  return (
    <>
      <Toolbar name="fees-report" rows={rows} columns={[
        { key: "adm", label: "Adm" }, { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
        { key: "amount", label: "Amount" }, { key: "discount", label: "Discount" }, { key: "fine", label: "Fine" }, { key: "paid", label: "Paid" }, { key: "balance", label: "Balance" }, { key: "due", label: "Due" }, { key: "status", label: "Status" },
      ]} />
      <ReportTable loading={loading} rows={rows} cols={["adm", "student", "title", "amount", "discount", "fine", "paid", "balance", "due", "status"]} headers={["Adm", "Student", "Invoice", "Amount", "Disc", "Fine", "Paid", "Balance", "Due", "Status"]} />
    </>
  );
}

function PeopleReport() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("students").select("full_name,admission_no,gender,classes(name),sections(name)").then(({ data }) => setStudents((data ?? []).map((r: any) => ({
      adm: r.admission_no, name: r.full_name, gender: r.gender, cls: r.classes?.name, sec: r.sections?.name,
    }))));
    supabase.from("teachers").select("full_name,email,phone,employee_no").then(({ data }) => setTeachers(data ?? []));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Students ({students.length})</h3>
        <Toolbar name="students-report" rows={students} columns={[{ key: "adm", label: "Adm" }, { key: "name", label: "Name" }, { key: "gender", label: "Gender" }, { key: "cls", label: "Class" }, { key: "sec", label: "Section" }]} />
        <ReportTable loading={false} rows={students} cols={["adm", "name", "gender", "cls", "sec"]} headers={["Adm", "Name", "Gender", "Class", "Section"]} />
      </div>
      <div>
        <h3 className="font-medium mb-2">Teachers ({teachers.length})</h3>
        <Toolbar name="teachers-report" rows={teachers} columns={[{ key: "employee_no", label: "Emp #" }, { key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }]} />
        <ReportTable loading={false} rows={teachers} cols={["employee_no", "full_name", "email", "phone"]} headers={["Emp #", "Name", "Email", "Phone"]} />
      </div>
    </div>
  );
}

function SummaryReport() {
  const [s, setS] = useState({ students: 0, teachers: 0, classes: 0, books: 0, fees_collected: 0, fees_pending: 0 });
  useEffect(() => {
    (async () => {
      const [a, b, c, d, e] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase.from("classes").select("*", { count: "exact", head: true }),
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("fee_invoices").select("amount,paid,status"),
      ]);
      const inv = (e.data ?? []) as any[];
      setS({
        students: a.count ?? 0, teachers: b.count ?? 0, classes: c.count ?? 0, books: d.count ?? 0,
        fees_collected: inv.reduce((x, y) => x + Number(y.paid ?? 0), 0),
        fees_pending: inv.filter((y) => y.status !== "paid").reduce((x, y) => x + (Number(y.amount) - Number(y.paid ?? 0)), 0),
      });
    })();
  }, []);
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(s).map(([k, v]) => (
        <div key={k} className="glass-card p-4">
          <div className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</div>
          <div className="text-2xl font-semibold mt-1">{typeof v === "number" && k.startsWith("fees") ? v.toLocaleString() : v}</div>
        </div>
      ))}
    </div>
  );
}

function ReportTable({ rows, cols, headers, loading }: { rows: any[]; cols: string[]; headers: string[]; loading: boolean }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={cols.length} className="p-0"><TableSkeleton rows={5} cols={cols.length} /></td></tr>
            : rows.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-muted-foreground">No data</td></tr>
            : rows.slice(0, 500).map((r, i) => (
              <tr key={i} className="border-t border-border">{cols.map((c) => <td key={c} className="px-3 py-2">{r[c] ?? "—"}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 500 && <div className="text-xs text-muted-foreground px-3 py-2 border-t border-border">Showing first 500 of {rows.length}. Export CSV for full dataset.</div>}
    </div>
  );
}
