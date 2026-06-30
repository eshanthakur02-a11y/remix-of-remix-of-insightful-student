import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/transport/drivers")({ component: Page });

type Row = { id: string; full_name: string; phone: string | null; license_no: string | null; status: string };

function Page() {
  const { schoolId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = { full_name: "", phone: "", license_no: "", status: "active" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const { error } = await supabase.from("drivers").insert({
      school_id: schoolId, full_name: form.full_name, phone: form.phone || null,
      license_no: form.license_no || null, status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Driver added"); setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete driver?")) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <PageHeader title="Drivers" description="Driver roster and licensing." />
      <DataTable rows={rows} loading={loading} filename="drivers" searchKeys={["full_name", "phone", "license_no"]} emptyTitle="No drivers"
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "full_name", label: "Name" }, { key: "phone", label: "Phone" },
          { key: "license_no", label: "License" }, { key: "status", label: "Status" },
          { key: "_", label: "", render: (r) => <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New driver</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>License no.</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="leave">On leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
