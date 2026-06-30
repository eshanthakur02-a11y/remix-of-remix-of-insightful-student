import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, AlertTriangle, Grid3x3, Table as TableIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/timetable")({ component: Page });

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 7, label: "Sun" },
];
type Slot = { id: string; class_id: string; section_id: string | null; subject_id: string | null; teacher_id: string | null; day_of_week: number; start_time: string; end_time: string };
type Named = { id: string; name: string } | { id: string; full_name: string };

function Page() {
  const [rows, setRows] = useState<Slot[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const empty = { class_id: "", section_id: "", subject_id: "", teacher_id: "", day_of_week: "1", start_time: "09:00", end_time: "09:45" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const [{ data: t }, { data: c }, { data: s }, { data: sub }, { data: te }] = await Promise.all([
      supabase.from("timetable").select("*"),
      supabase.from("classes").select("id,name").eq("status", "active").order("name"),
      supabase.from("sections").select("id,name,class_id").eq("status", "active").order("name"),
      supabase.from("subjects").select("id,name").order("name"),
      supabase.from("teachers").select("id,full_name").order("full_name"),
    ]);
    setRows((t ?? []) as Slot[]); setClasses(c ?? []); setSections(s ?? []); setSubjects(sub ?? []); setTeachers(te ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    // conflict detection
    const conflict = rows.find((r) =>
      r.day_of_week === Number(form.day_of_week) &&
      r.start_time < form.end_time && r.end_time > form.start_time &&
      ((r.class_id === form.class_id && (r.section_id ?? "") === (form.section_id || "")) ||
       (form.teacher_id && r.teacher_id === form.teacher_id))
    );
    if (conflict) {
      const c = classes.find((x) => x.id === conflict.class_id)?.name;
      if (!confirm(`Conflicts with ${c} ${conflict.start_time}-${conflict.end_time}. Save anyway?`)) return;
    }
    const { error } = await supabase.from("timetable").insert({
      class_id: form.class_id, section_id: form.section_id || null,
      subject_id: form.subject_id || null, teacher_id: form.teacher_id || null,
      day_of_week: Number(form.day_of_week), start_time: form.start_time, end_time: form.end_time,
    });
    if (error) return toast.error(error.message);
    toast.success("Slot added"); setOpen(false); setForm(empty); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const visible = useMemo(() => classFilter ? rows.filter((r) => r.class_id === classFilter) : rows, [rows, classFilter]);

  const grid = useMemo(() => {
    // unique time slots
    const slots = Array.from(new Set(visible.map((r) => `${r.start_time}-${r.end_time}`))).sort();
    const byDay: Record<string, Record<number, Slot[]>> = {};
    slots.forEach((s) => { byDay[s] = {}; DAYS.forEach((d) => { byDay[s][d.value] = []; }); });
    visible.forEach((r) => {
      const key = `${r.start_time}-${r.end_time}`;
      byDay[key] = byDay[key] ?? {};
      byDay[key][r.day_of_week] = byDay[key][r.day_of_week] ?? [];
      byDay[key][r.day_of_week].push(r);
    });
    return { slots, byDay };
  }, [visible]);

  return (
    <>
      <PageHeader title="Timetable" description="Weekly schedule with conflict detection." actions={
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add slot</Button>
      } />

      <div className="flex items-end gap-3 mb-3">
        <div><Label>Filter by class</Label>
          <Select value={classFilter || "__all"} onValueChange={(v) => setClassFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="ml-auto">Print</Button>
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid"><Grid3x3 className="h-4 w-4 mr-1" /> Grid</TabsTrigger>
          <TabsTrigger value="list"><TableIcon className="h-4 w-4 mr-1" /> List</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead className="bg-muted/40 uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Time</th>{DAYS.map((d) => <th key={d.value} className="px-3 py-2 text-left">{d.label}</th>)}</tr>
              </thead>
              <tbody>
                {grid.slots.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No slots — add one above.</td></tr>}
                {grid.slots.map((s) => (
                  <tr key={s} className="border-t border-border">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{s}</td>
                    {DAYS.map((d) => (
                      <td key={d.value} className="px-2 py-2 align-top">
                        {(grid.byDay[s]?.[d.value] ?? []).map((slot) => {
                          const isConflict = (grid.byDay[s]?.[d.value] ?? []).length > 1;
                          return (
                            <div key={slot.id} className={`p-1.5 rounded mb-1 ${isConflict ? "bg-destructive/10 border border-destructive/40" : "bg-muted/40"}`}>
                              <div className="font-medium">{subjects.find((x) => x.id === slot.subject_id)?.name ?? "—"}</div>
                              <div className="text-muted-foreground">{teachers.find((x) => x.id === slot.teacher_id)?.full_name ?? "—"}</div>
                              <div className="text-muted-foreground">{classes.find((x) => x.id === slot.class_id)?.name} / {sections.find((x) => x.id === slot.section_id)?.name ?? "—"}</div>
                              <button onClick={() => remove(slot.id)} className="text-destructive text-[10px] hover:underline">remove</button>
                            </div>
                          );
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Day</th><th className="text-left px-3 py-2">Time</th><th className="text-left px-3 py-2">Class/Section</th><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Teacher</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{DAYS.find((d) => d.value === r.day_of_week)?.label}</td>
                    <td className="px-3 py-2">{r.start_time}–{r.end_time}</td>
                    <td className="px-3 py-2">{classes.find((c) => c.id === r.class_id)?.name} / {sections.find((s) => s.id === r.section_id)?.name ?? "—"}</td>
                    <td className="px-3 py-2">{subjects.find((s) => s.id === r.subject_id)?.name ?? "—"}</td>
                    <td className="px-3 py-2">{teachers.find((t) => t.id === r.teacher_id)?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No slots.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add timetable slot</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Class *</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label>
              <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })} disabled={!form.class_id}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{sections.filter((s) => s.class_id === form.class_id).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Day *</Label>
              <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Teacher</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start *</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End *</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <DialogFooter className="col-span-2">
              <div className="text-xs text-muted-foreground mr-auto flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Conflicts will warn before saving.</div>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
