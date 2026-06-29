import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/homework")({ component: Page });

type Hw = { id: string; title: string; status: string; due_date: string | null; created_at: string; class_id: string | null; section_id: string | null; subject_id: string | null };

function Page() {
  const [rows, setRows] = useState<Hw[]>([]);
  const [counts, setCounts] = useState<Record<string, { submitted: number; total: number }>>({});
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: hw }, { data: c }, { data: s }, { data: sub }] = await Promise.all([
        supabase.from("homework").select("id,title,status,due_date,created_at,class_id,section_id,subject_id").order("created_at", { ascending: false }),
        supabase.from("classes").select("id,name"),
        supabase.from("sections").select("id,name,class_id"),
        supabase.from("subjects").select("id,name"),
      ]);
      const list = (hw ?? []) as Hw[];
      setRows(list);
      setClasses((c ?? []) as never); setSections((s ?? []) as never); setSubjects((sub ?? []) as never);

      // submission stats per hw
      const ids = list.map((h) => h.id);
      if (ids.length) {
        const { data: subRows } = await supabase.from("homework_submissions").select("homework_id").in("homework_id", ids);
        const subCount: Record<string, number> = {};
        (subRows ?? []).forEach((r) => { subCount[r.homework_id] = (subCount[r.homework_id] ?? 0) + 1; });
        const map: Record<string, { submitted: number; total: number }> = {};
        for (const h of list) {
          let total = 0;
          if (h.section_id) {
            const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("section_id", h.section_id);
            total = count ?? 0;
          }
          map[h.id] = { submitted: subCount[h.id] ?? 0, total };
        }
        setCounts(map);
      }
      setLoading(false);
    })();
  }, []);

  const totalSubmitted = Object.values(counts).reduce((a, b) => a + b.submitted, 0);
  const totalExpected = Object.values(counts).reduce((a, b) => a + b.total, 0);
  const active = rows.filter((r) => r.status === "active").length;

  return (
    <>
      <PageHeader title="Homework" description="Read-only overview across the school." />
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Active homework</div><div className="text-2xl font-semibold">{active}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Total submissions</div><div className="text-2xl font-semibold">{totalSubmitted}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-muted-foreground">Submission rate</div><div className="text-2xl font-semibold">{totalExpected ? Math.round((totalSubmitted / totalExpected) * 100) : 0}%</div></div>
      </div>
      <DataTable<Hw>
        rows={rows} loading={loading} filename="homework-overview"
        searchKeys={["title"]} emptyTitle="No homework yet"
        columns={[
          { key: "title", label: "Title" },
          { key: "subject_id", label: "Subject", render: (r) => subjects.find((s) => s.id === r.subject_id)?.name ?? "—" },
          { key: "class_id", label: "Class/Section", render: (r) => `${classes.find((c) => c.id === r.class_id)?.name ?? "—"} / ${sections.find((s) => s.id === r.section_id)?.name ?? "—"}` },
          { key: "due_date", label: "Due", render: (r) => r.due_date ?? "—" },
          { key: "submissions", label: "Submissions", render: (r) => `${counts[r.id]?.submitted ?? 0} / ${counts[r.id]?.total ?? 0}` },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "archived" ? "secondary" : "default"}>{r.status}</Badge> },
        ]}
      />
    </>
  );
}
