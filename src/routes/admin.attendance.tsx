import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Save, Users, CheckCircle2, XCircle, Clock, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { exportCSV } from "@/lib/csv-export";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/attendance")({ component: Page });

type Cls = { id: string; name: string };
type Sec = { id: string; name: string; class_id: string };
type Stu = { id: string; full_name: string; admission_no: string | null };
type Att = { id: string; date: string; status: string; student_id: string; section_id: string | null; notes: string | null };

const STATUSES = ["present", "absent", "late", "leave"] as const;
type Status = (typeof STATUSES)[number];

function Page() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [sections, setSections] = useState<Sec[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Stu[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // history
  const [histFrom, setHistFrom] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [histTo, setHistTo] = useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<(Att & { student_name?: string })[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id,name").eq("status", "active").order("name").then(({ data }) => setClasses(data ?? []));
    supabase.from("sections").select("id,name,class_id").eq("status", "active").order("name").then(({ data }) => setSections(data ?? []));
  }, []);

  const filteredSections = useMemo(() => sections.filter((s) => s.class_id === classId), [sections, classId]);

  async function loadStudents() {
    if (!classId) return toast.error("Select a class");
    setLoading(true);
    let q = supabase.from("students").select("id,full_name,admission_no").eq("class_id", classId).order("full_name");
    if (sectionId) q = q.eq("section_id", sectionId);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data ?? []) as Stu[];
    setStudents(list);
    const { data: existing } = await supabase.from("attendance").select("student_id,status").eq("date", date).in("student_id", list.map((s) => s.id));
    const m: Record<string, Status> = {};
    list.forEach((s) => { m[s.id] = "present"; });
    (existing ?? []).forEach((r) => { m[r.student_id] = r.status as Status; });
    setMarks(m);
    setLoading(false);
  }

  function markAll(status: Status) {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  async function save() {
    if (!sectionId) return toast.error("Pick a section to save by RPC");
    setSaving(true);
    const entries = students.map((s) => ({ student_id: s.id, status: marks[s.id] ?? "present" }));
    const { error } = await supabase.rpc("mark_attendance_bulk", {
      _date: date, _section_id: sectionId, _entries: entries as never,
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success(`Saved ${entries.length} records`);
  }

  async function loadHistory() {
    setHistLoading(true);
    let q = supabase.from("attendance").select("id,date,status,student_id,section_id,notes,students(full_name)")
      .gte("date", histFrom).lte("date", histTo).order("date", { ascending: false }).limit(2000);
    if (sectionId) q = q.eq("section_id", sectionId);
    const { data, error } = await q;
    setHistLoading(false);
    if (error) return toast.error(error.message);
    setHistory((data ?? []).map((r: any) => ({ ...r, student_name: r.students?.full_name })));
  }

  const summary = useMemo(() => {
    const s: Record<Status, number> = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const v of Object.values(marks)) if (v in s) s[v as Status]++;
    return s;
  }, [marks]);

  async function deleteAttendance(id: string) {
    if (!confirm("Delete this attendance record?")) return;
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadHistory();
  }

  async function updateAttendance(id: string, status: string) {
    const { error } = await supabase.from("attendance").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); loadHistory();
  }

  return (
    <>
      <PageHeader title="Attendance Register" description="Mark daily attendance, audit history and export reports." />

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Register</TabsTrigger>
          <TabsTrigger value="history">History & Edit</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="glass-card p-4 grid sm:grid-cols-5 gap-3">
            <div><Label>Class *</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section *</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Pick section" /></SelectTrigger>
                <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="flex items-end"><Button onClick={loadStudents} disabled={loading} className="w-full gap-2"><Users className="h-4 w-4" /> {loading ? "Loading…" : "Load"}</Button></div>
            <div className="flex items-end"><Button onClick={save} disabled={saving || students.length === 0} className="w-full gap-2" variant="default"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button></div>
          </div>

          {students.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {STATUSES.map((s) => (
                  <div key={s} className="glass-card p-3">
                    <div className="text-xs uppercase text-muted-foreground">{s}</div>
                    <div className="text-2xl font-semibold">{summary[s]}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => markAll("present")}><CheckCircle2 className="h-4 w-4 mr-1" /> All Present</Button>
                <Button size="sm" variant="outline" onClick={() => markAll("absent")}><XCircle className="h-4 w-4 mr-1" /> All Absent</Button>
                <Button size="sm" variant="outline" onClick={() => markAll("late")}><Clock className="h-4 w-4 mr-1" /> All Late</Button>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => exportCSV(`attendance-${date}`, students.map((s) => ({
                  adm: s.admission_no, name: s.full_name, status: marks[s.id] ?? "",
                })), [{ key: "adm", label: "Admission" }, { key: "name", label: "Name" }, { key: "status", label: "Status" }])}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left px-4 py-3">Adm #</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3 w-72">Status</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">{s.admission_no ?? "—"}</td>
                        <td className="px-4 py-2 font-medium">{s.full_name}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {STATUSES.map((st) => (
                              <button key={st} type="button" onClick={() => setMarks({ ...marks, [s.id]: st })}
                                className={`px-2.5 py-1 rounded text-xs capitalize border ${marks[s.id] === st ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && students.length === 0 && (
            <EmptyState icon={CalendarDays} title="Load a class to begin" description="Pick a class, section and date, then click Load." />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="glass-card p-4 grid sm:grid-cols-5 gap-3">
            <div><Label>From</Label><Input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} /></div>
            <div><Label>Section (optional)</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button onClick={loadHistory} className="w-full">Search</Button></div>
            <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => setSectionId("")}>Clear filter</Button></div>
          </div>

          <DataTable
            rows={history}
            loading={histLoading}
            filename="attendance-history"
            searchKeys={["student_name", "status", "date"]}
            emptyTitle="No attendance in range"
            columns={[
              { key: "date", label: "Date" },
              { key: "student_name", label: "Student" },
              { key: "status", label: "Status", render: (r: any) => (
                <Select value={r.status} onValueChange={(v) => updateAttendance(r.id, v)}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )},
              { key: "notes", label: "Notes" },
              { key: "actions", label: "", render: (r: any) => (
                <Button size="sm" variant="ghost" onClick={() => deleteAttendance(r.id)}>Delete</Button>
              )},
            ]}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsView />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AnalyticsView() {
  const [stats, setStats] = useState<{ status: string; n: number }[]>([]);
  const [byClass, setByClass] = useState<{ class_name: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("attendance").select("status,student_id,students(class_id,classes(name))").gte("date", from);
      const agg: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
      const cls: Record<string, { present: number; total: number; name: string }> = {};
      (data ?? []).forEach((r: any) => {
        agg[r.status] = (agg[r.status] ?? 0) + 1;
        const name = r.students?.classes?.name ?? "—";
        const cid = r.students?.class_id ?? "n/a";
        cls[cid] = cls[cid] ?? { present: 0, total: 0, name };
        cls[cid].total++;
        if (r.status === "present") cls[cid].present++;
      });
      setStats(Object.entries(agg).map(([status, n]) => ({ status, n })));
      setByClass(Object.values(cls).map((c) => ({ class_name: c.name, rate: c.total ? Math.round((c.present / c.total) * 100) : 0 })));
      setLoading(false);
    })();
  }, [from]);

  const total = stats.reduce((a, b) => a + b.n, 0);

  return (
    <>
      <div className="glass-card p-4 flex flex-wrap items-end gap-3">
        <div><Label>Since</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="text-sm text-muted-foreground">Computed over {total} records</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.status} className="glass-card p-4">
            <div className="text-xs uppercase text-muted-foreground">{s.status}</div>
            <div className="text-2xl font-semibold">{s.n}</div>
            <Badge variant="secondary" className="mt-2">{total ? Math.round((s.n / total) * 100) : 0}%</Badge>
          </div>
        ))}
      </div>
      <div className="glass-card p-4">
        <h3 className="font-medium mb-3">Attendance rate by class</h3>
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
          <div className="space-y-2">
            {byClass.map((c) => (
              <div key={c.class_name} className="flex items-center gap-3">
                <div className="w-32 text-sm">{c.class_name}</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${c.rate}%` }} /></div>
                <div className="w-12 text-right text-sm tabular-nums">{c.rate}%</div>
              </div>
            ))}
            {byClass.length === 0 && <div className="text-sm text-muted-foreground">No data.</div>}
          </div>
        }
      </div>
    </>
  );
}
