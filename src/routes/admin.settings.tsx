import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: Page });

type School = { id: string; name: string; code: string | null; email: string | null; phone: string | null; address: string | null; logo_url: string | null };

function Page() {
  const { schoolId } = useAuth();
  const qc = useQueryClient();
  const { data: school } = useQuery<School | null>({
    queryKey: ["admin-school-settings", schoolId],
    enabled: !!schoolId,
    queryFn: async () => (await supabase.from("schools").select("id,name,code,email,phone,address,logo_url").eq("id", schoolId!).single()).data as School,
  });
  const [form, setForm] = useState<Partial<School>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (school) setForm(school); }, [school?.id]);
  useEffect(() => {
    (async () => {
      if (school?.logo_url) {
        try { setLogoPreview(await getSignedUrl("school-logos", school.logo_url)); } catch { setLogoPreview(null); }
      } else setLogoPreview(null);
    })();
  }, [school?.logo_url]);

  async function save() {
    if (!schoolId) return;
    setBusy(true);
    const { error } = await supabase.from("schools").update({
      name: form.name, code: form.code, email: form.email, phone: form.phone, address: form.address,
    }).eq("id", schoolId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("School profile updated");
    qc.invalidateQueries({ queryKey: ["admin-school-settings", schoolId] });
  }

  async function onLogo(file: File) {
    if (!schoolId) return;
    setBusy(true);
    try {
      const path = `${schoolId}/logo-${Date.now()}-${file.name}`;
      await uploadFile("school-logos", path, file);
      await supabase.from("schools").update({ logo_url: path }).eq("id", schoolId);
      toast.success("Logo updated");
      qc.invalidateQueries({ queryKey: ["admin-school-settings", schoolId] });
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="School Settings" description="Profile, branding, and contact details." />
      <div className="glass-card p-6 max-w-3xl space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
            {logoPreview ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" /> : "No logo"}
          </div>
          <div>
            <Label className="text-sm">Logo</Label>
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Textarea rows={3} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <Button onClick={save} disabled={busy}>Save changes</Button>
      </div>
    </>
  );
}
