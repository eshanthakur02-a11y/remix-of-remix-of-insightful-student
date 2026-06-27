import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore, Loader2, Plus, Trash2 } from "lucide-react";
import { RoleShell } from "@/components/RoleShell";
import { adminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  setClassStatus, deleteClassSafe, setSectionStatus, deleteSectionSafe,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/classes")({ component: Page });

type Cls = { id: string; name: string; status: string };
type Sec = { id: string; name: string; class_id: string; status: string };

function Page() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [sections, setSections] = useState<Sec[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newClass, setNewClass] = useState("");
  const [newSection, setNewSection] = useState({ name: "", class_id: "" });

  const setCStatus = useServerFn(setClassStatus);
  const delClass = useServerFn(deleteClassSafe);
  const setSStatus = useServerFn(setSectionStatus);
  const delSection = useServerFn(deleteSectionSafe);

  const load = useCallback(async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("classes").select("id,name,status").order("name"),
      supabase.from("sections").select("id,name,class_id,status").order("name"),
    ]);
    setClasses((c ?? []) as Cls[]);
    setSections((s ?? []) as Sec[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addClass(e: FormEvent) {
    e.preventDefault();
    if (!newClass.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("classes").insert({ name: newClass.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewClass("");
    toast.success("Class created");
    load();
  }
  async function addSection(e: FormEvent) {
    e.preventDefault();
    if (!newSection.class_id || !newSection.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("sections").insert({
      name: newSection.name.trim(), class_id: newSection.class_id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewSection({ name: "", class_id: newSection.class_id });
    toast.success("Section created");
    load();
  }
  async function run<T>(p: Promise<T>, ok: string) {
    try { await p; toast.success(ok); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  const visibleClasses = classes.filter((c) => showArchived || c.status === "active");
  const activeClasses = classes.filter((c) => c.status === "active");

  return (
    <RoleShell role="school_admin" navItems={adminNav}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Classes & Sections</h1>
          <p className="text-sm text-muted-foreground">Create, archive, or delete academic structure.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Classes */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Classes</h2>
          </div>
          <form onSubmit={addClass} className="flex gap-2 mb-4">
            <Input placeholder="e.g. Grade 5" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
            <Button type="submit" disabled={busy || !newClass.trim()}><Plus className="h-4 w-4" /></Button>
          </form>
          <div className="divide-y divide-border/60">
            {visibleClasses.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className={c.status === "archived" ? "text-muted-foreground line-through" : ""}>{c.name}</span>
                  {c.status === "archived" && <Badge variant="secondary">Archived</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "active" ? (
                    <Button size="icon" variant="ghost" title="Archive" onClick={() => run(setCStatus({ data: { id: c.id, status: "archived" } }), "Archived")}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" title="Restore" onClick={() => run(setCStatus({ data: { id: c.id, status: "active" } }), "Restored")}>
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Delete (only if unused)" onClick={() => {
                    if (confirm("Delete this class? Only allowed if nothing references it.")) {
                      run(delClass({ data: { id: c.id } }), "Deleted");
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {visibleClasses.length === 0 && <div className="text-sm text-muted-foreground py-4">No classes yet.</div>}
          </div>
        </section>

        {/* Sections */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Sections</h2>
          </div>
          <form onSubmit={addSection} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-4">
            <Select value={newSection.class_id} onValueChange={(v) => setNewSection((s) => ({ ...s, class_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>{activeClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Section (e.g. A)" value={newSection.name} onChange={(e) => setNewSection((s) => ({ ...s, name: e.target.value }))} />
            <Button type="submit" disabled={busy || !newSection.class_id || !newSection.name.trim()}><Plus className="h-4 w-4" /></Button>
          </form>
          <div className="divide-y divide-border/60">
            {sections.filter((s) => showArchived || s.status === "active").map((s) => {
              const cls = classes.find((c) => c.id === s.class_id);
              return (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{cls?.name ?? "—"}</span>
                    <span>/</span>
                    <span className={s.status === "archived" ? "text-muted-foreground line-through" : ""}>{s.name}</span>
                    {s.status === "archived" && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.status === "active" ? (
                      <Button size="icon" variant="ghost" onClick={() => run(setSStatus({ data: { id: s.id, status: "archived" } }), "Archived")}><Archive className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => run(setSStatus({ data: { id: s.id, status: "active" } }), "Restored")}><ArchiveRestore className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm("Delete this section? Only allowed if nothing references it.")) {
                        run(delSection({ data: { id: s.id } }), "Deleted");
                      }
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              );
            })}
            {sections.length === 0 && <div className="text-sm text-muted-foreground py-4">No sections yet.</div>}
          </div>
        </section>
      </div>
    </RoleShell>
  );
}
