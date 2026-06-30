import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { updateSchoolFeatures } from "@/lib/superadmin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/settings")({ component: Page });

const FLAGS = [
  { key: "student_login", label: "Student Login", desc: "Allow students to sign in with their own credentials." },
  { key: "parent_portal", label: "Parent Portal", desc: "Enable parent dashboard for this school." },
  { key: "transport", label: "Transport Module", desc: "Enable transport / routes / vehicles." },
  { key: "library", label: "Library Module", desc: "Enable book issue / return tracking." },
  { key: "fees", label: "Fees Module", desc: "Enable fee structure, invoices, receipts." },
  { key: "messaging", label: "Messaging", desc: "Enable in-app messages between users." },
];

type School = { id: string; name: string; features: any };

function Page() {
  const update = useServerFn(updateSchoolFeatures);
  const { data: schools = [], refetch } = useQuery<School[]>({
    queryKey: ["schools-features"],
    queryFn: async () => (await supabase.from("schools").select("id,name,features").order("name")).data ?? [],
  });
  const [schoolId, setSchoolId] = useState<string>("");
  const current = schools.find((s) => s.id === schoolId);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!current) return;
    const f: Record<string, boolean> = {};
    for (const flag of FLAGS) f[flag.key] = (current.features?.[flag.key] !== false);
    setFeatures(f);
  }, [current?.id]);

  async function save() {
    if (!schoolId) return;
    try {
      await update({ data: { school_id: schoolId, features } });
      toast.success("Feature flags saved");
      refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <>
      <PageHeader title="Platform Settings" description="Feature flags & per-school overrides." />
      <div className="glass-card p-6 max-w-3xl space-y-6">
        <div className="space-y-1.5">
          <Label>School</Label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger><SelectValue placeholder="Pick a school to configure" /></SelectTrigger>
            <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {schoolId && (
          <>
            <div className="divide-y divide-border/60">
              {FLAGS.map((f) => (
                <div key={f.key} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                  <Switch checked={features[f.key] ?? true} onCheckedChange={(v) => setFeatures({ ...features, [f.key]: v })} />
                </div>
              ))}
            </div>
            <Button onClick={save}>Save changes</Button>
          </>
        )}
      </div>
    </>
  );
}
