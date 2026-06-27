import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Upload, Download, Calendar } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { PageHeader } from "@/components/PageHeader";
import { studentNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { audit, getSignedUrl, uploadHomeworkAttachment, type HwAttachment } from "@/lib/homework";
import { toast } from "sonner";

export const Route = createFileRoute("/student/homework")({ component: Page });

type Hw = { id: string; title: string; description: string | null; due_date: string | null; subject_id: string | null; school_id: string; section_id: string | null; attachments: HwAttachment[] | null; status: string };
type Sub = { id: string; homework_id: string; status: string; marks: number | null; grade: string | null; feedback: string | null; attachments: HwAttachment[] | null; submitted_at: string };

function Page() {
  const [list, setList] = useState<Hw[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Hw | null>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id; if (!uid) return;
    const { data: me } = await supabase.from("students").select("id,school_id").eq("user_id", uid).maybeSingle();
    if (!me) { setLoading(false); return; }
    setStudentId(me.id); setSchoolId(me.school_id);
    const [{ data: hw }, { data: ss }, { data: sj }] = await Promise.all([
      supabase.from("homework").select("*").eq("status", "active").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("homework_submissions").select("*").eq("student_id", me.id),
      supabase.from("subjects").select("id,name"),
    ]);
    setList((hw ?? []) as Hw[]);
    const m: Record<string, Sub> = {};
    (ss ?? []).forEach((r) => { m[r.homework_id] = r as Sub; });
    setSubs(m);
    setSubjects((sj ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function submit() {
    if (!open || !studentId || !schoolId) return;
    setBusy(true);
    try {
      const uploaded: HwAttachment[] = [];
      for (const f of files) uploaded.push(await uploadHomeworkAttachment("assignments", schoolId, f));
      const isLate = open.due_date && today > open.due_date;
      const existing = subs[open.id];
      const payload = {
        homework_id: open.id, student_id: studentId, school_id: schoolId,
        attachments: [...(existing?.attachments ?? []), ...uploaded] as never,
        note: note || null, status: isLate ? "late" : "submitted", submitted_at: new Date().toISOString(),
      };
      const { error } = existing
        ? await supabase.from("homework_submissions").update(payload).eq("id", existing.id)
        : await supabase.from("homework_submissions").insert(payload);
      if (error) throw error;
      await audit("homework.submitted", open.id, { student_id: studentId, late: isLate });
      toast.success("Submitted"); setOpen(null); setNote(""); setFiles([]); load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function openFile(p: HwAttachment) { window.open(await getSignedUrl("assignments", p.path), "_blank"); }

  return (
    <RoleShell role="student" navItems={studentNav}>
      <PageHeader title="My Homework" description="Assigned work and submissions." />
      {loading ? <div className="text-muted-foreground">Loading…</div>
        : list.length === 0 ? <div className="glass-card p-8 text-center text-muted-foreground">No active homework right now.</div>
        : <div className="grid md:grid-cols-2 gap-3">
          {list.map((h) => {
            const sub = subs[h.id];
            const overdue = h.due_date && today > h.due_date && !sub;
            return (
              <div key={h.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{subjects.find((s) => s.id === h.subject_id)?.name ?? "—"}</div></div>
                  <Badge variant={sub ? (sub.status === "graded" ? "default" : "secondary") : overdue ? "destructive" : "outline"}>{sub?.status ?? (overdue ? "overdue" : "pending")}</Badge>
                </div>
                {h.description && <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Due {h.due_date ?? "—"}</div>
                {h.attachments?.length ? <div className="flex flex-wrap gap-1">{h.attachments.map((a) => <Button key={a.path} size="sm" variant="ghost" onClick={() => openFile(a)}><Download className="h-3 w-3 mr-1" />{a.name}</Button>)}</div> : null}
                {sub?.grade && <div className="text-sm">Grade: <b>{sub.grade}</b>{sub.marks != null && ` · ${sub.marks}`}{sub.feedback && <div className="text-xs text-muted-foreground mt-1">{sub.feedback}</div>}</div>}
                <Button size="sm" onClick={() => { setOpen(h); setNote(""); setFiles([]); }} disabled={sub?.status === "graded"}>
                  <Upload className="h-4 w-4 mr-2" /> {sub ? "Re-submit" : "Submit"}
                </Button>
              </div>
            );
          })}
        </div>
      }

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit: {open?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Note (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></div>
            <div><Label>Files</Label><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Uploading…" : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleShell>
  );
}
