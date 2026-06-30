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

export const Route = createFileRoute("/transport/vehicles")({ component: Page });

type Row = { id: string; reg_no: string; model: string | null; capacity: number; status: string };

function Page() {
  const { schoolId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = { reg_no: "", model: "", capacity: "", status: "active" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const { error } = await supabase.from("vehicles").insert({
      school_id: schoolId, reg_no: form.reg_no, model: form.model || null,
      capacity: Number(form.capacity) || 0, status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Vehicle added"); setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete vehicle?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <PageHeader title="Vehicles" description="Fleet inventory and capacity." />
      <DataTable rows={rows} loading={loading} filename="vehicles" searchKeys={["reg_no", "model"]} emptyTitle="No vehicles"
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "reg_no", label: "Reg No" }, { key: "model", label: "Model" }, { key: "capacity", label: "Seats" },
          { key: "status", label: "Status" },
          { key: "_", label: "", render: (r) => <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New vehicle</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Registration *</Label><Input required value={form.reg_no} onChange={(e) => setForm({ ...form, reg_no: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
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
