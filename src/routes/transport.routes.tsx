import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
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

export const Route = createFileRoute("/transport/routes")({ component: Page });

type Route = { id: string; name: string; vehicle_id: string | null; driver_id: string | null; vehicle_no: string | null; driver_name: string | null };
type Stop = { id: string; route_id: string; name: string; sequence: number; pickup_time: string | null; drop_time: string | null };

function Page() {
  const { schoolId } = useAuth();
  const [rows, setRows] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<{ id: string; reg_no: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const empty = { name: "", vehicle_id: "", driver_id: "" };
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<Route | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, v, d] = await Promise.all([
      supabase.from("transport_routes").select("id,name,vehicle_id,driver_id,vehicle_no,driver_name").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id,reg_no").order("reg_no"),
      supabase.from("drivers").select("id,full_name").order("full_name"),
    ]);
    setRows((r.data ?? []) as Route[]);
    setVehicles(v.data ?? []); setDrivers(d.data ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const { error } = await supabase.from("transport_routes").insert({
      school_id: schoolId, name: form.name,
      vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Route added"); setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete route (and its stops)?")) return;
    const { error } = await supabase.from("transport_routes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <>
      <PageHeader title="Routes & Stops" description="Routes with pickup stops, vehicles and drivers." />
      <DataTable rows={rows} loading={loading} filename="routes" searchKeys={["name"]} emptyTitle="No routes"
        toolbar={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        columns={[
          { key: "name", label: "Route" },
          { key: "vehicle_id", label: "Vehicle", render: (r: Route) => vehicles.find((v) => v.id === r.vehicle_id)?.reg_no ?? r.vehicle_no ?? "—" },
          { key: "driver_id", label: "Driver", render: (r: Route) => drivers.find((d) => d.id === r.driver_id)?.full_name ?? r.driver_name ?? "—" },
          { key: "_", label: "", render: (r: Route) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelected(r)}><MapPin className="h-4 w-4 mr-1" /> Stops</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New route</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.reg_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selected && <StopsDialog route={selected} onClose={() => setSelected(null)} schoolId={schoolId} />}
    </>
  );
}

function StopsDialog({ route, schoolId, onClose }: { route: Route; schoolId: string | null; onClose: () => void }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [name, setName] = useState(""); const [seq, setSeq] = useState(""); const [pt, setPt] = useState(""); const [dt, setDt] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("route_stops").select("*").eq("route_id", route.id).order("sequence");
    setStops((data ?? []) as Stop[]);
  }, [route.id]);
  useEffect(() => { load(); }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const { error } = await supabase.from("route_stops").insert({
      school_id: schoolId, route_id: route.id, name, sequence: Number(seq) || stops.length + 1,
      pickup_time: pt || null, drop_time: dt || null,
    });
    if (error) return toast.error(error.message);
    setName(""); setSeq(""); setPt(""); setDt(""); load();
  }
  async function remove(id: string) {
    await supabase.from("route_stops").delete().eq("id", id); load();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Stops — {route.name}</DialogTitle></DialogHeader>
        <form onSubmit={add} className="grid grid-cols-5 gap-2 items-end">
          <div className="col-span-2"><Label>Stop name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Seq</Label><Input type="number" value={seq} onChange={(e) => setSeq(e.target.value)} /></div>
          <div><Label>Pickup</Label><Input type="time" value={pt} onChange={(e) => setPt(e.target.value)} /></div>
          <div><Label>Drop</Label><Input type="time" value={dt} onChange={(e) => setDt(e.target.value)} /></div>
          <div className="col-span-5"><Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Add stop</Button></div>
        </form>
        <div className="glass-card overflow-hidden mt-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Stop</th>
              <th className="text-left px-3 py-2">Pickup</th><th className="text-left px-3 py-2">Drop</th><th></th>
            </tr></thead>
            <tbody>
              {stops.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2">{s.sequence}</td><td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.pickup_time ?? "—"}</td><td className="px-3 py-2">{s.drop_time ?? "—"}</td>
                  <td className="px-2 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
              ))}
              {stops.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No stops yet</td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
