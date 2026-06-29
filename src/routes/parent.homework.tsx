import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl, type HwAttachment } from "@/lib/homework";

export const Route = createFileRoute("/parent/homework")({ component: Page });

type Child = { id: string; full_name: string; section_id: string | null };
type Hw = { id: string; title: string; description: string | null; due_date: string | null; subject_id: string | null; section_id: string | null; attachments: HwAttachment[] | null };
type Sub = { homework_id: string; status: string; grade: string | null; marks: number | null };

function Page() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string>("");
  const [list, setList] = useState<Hw[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id; if (!uid) return;
      const { data: p } = await supabase.from("parents").select("id").eq("user_id", uid).maybeSingle();
      if (!p) { setLoading(false); return; }
      const { data: ps } = await supabase.from("parent_students").select("student_id, students(id,full_name,section_id)").eq("parent_id", p.id);
      const ch = (ps ?? []).map((r: any) => r.students).filter(Boolean) as Child[];
      setChildren(ch);
      if (ch.length) setChildId(ch[0].id);
      const { data: sj } = await supabase.from("subjects").select("id,name");
      setSubjects((sj ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoading(true);
      const child = children.find((c) => c.id === childId);
      if (!child?.section_id) { setList([]); setLoading(false); return; }
      const [{ data: hw }, { data: ss }] = await Promise.all([
        supabase.from("homework").select("*").eq("section_id", child.section_id).eq("status", "active").order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("homework_submissions").select("homework_id,status,grade,marks").eq("student_id", childId),
      ]);
      setList((hw ?? []) as Hw[]);
      const map: Record<string, Sub> = {};
      (ss ?? []).forEach((r) => { map[r.homework_id] = r as Sub; });
      setSubs(map);
      setLoading(false);
    })();
  }, [childId, children]);

  async function openFile(p: HwAttachment) { window.open(await getSignedUrl("assignments", p.path), "_blank"); }

  return (
    <>
      <PageHeader
        title="Child's Homework"
        description="Stay on top of due dates and submissions."
        actions={
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choose child" /></SelectTrigger>
            <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
          </Select>
        }
      />
      {loading ? <div className="text-muted-foreground">Loading…</div>
        : list.length === 0 ? <div className="glass-card p-8 text-center text-muted-foreground">No active homework.</div>
        : <div className="grid md:grid-cols-2 gap-3">
          {list.map((h) => {
            const sub = subs[h.id];
            return (
              <div key={h.id} className="glass-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{subjects.find((s) => s.id === h.subject_id)?.name ?? "—"}</div></div>
                  <Badge variant={sub ? (sub.status === "graded" ? "default" : "secondary") : "outline"}>{sub?.status ?? "pending"}</Badge>
                </div>
                {h.description && <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Due {h.due_date ?? "—"}</div>
                {h.attachments?.length ? <div className="flex flex-wrap gap-1">{h.attachments.map((a) => <Button key={a.path} size="sm" variant="ghost" onClick={() => openFile(a)}><Download className="h-3 w-3 mr-1" />{a.name}</Button>)}</div> : null}
                {sub?.grade && <div className="text-sm">Grade: <b>{sub.grade}</b>{sub.marks != null && ` · ${sub.marks}`}</div>}
              </div>
            );
          })}
        </div>
      }
    </>
  );
}
