import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/TableSkeleton";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Column<T = any> = { key: keyof T | string; label: string; render?: (row: any) => React.ReactNode };

export function CrudTable<T extends { id: string }>({
  title,
  table,
  columns,
  fields,
  orderBy = "created_at",
  initialForm = {},
  canDelete = true,
  canCreate = true,
  filter,
}: {
  title: string;
  table: string;
  columns: Column<T>[];
  fields: Field[];
  orderBy?: string;
  initialForm?: Record<string, unknown>;
  canDelete?: boolean;
  canCreate?: boolean;
  filter?: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const queryKey = ["crud", table, filter ?? null, orderBy] as const;

  const { data: rows = [], isLoading } = useQuery<T[]>({
    queryKey,
    staleTime: 30_000,
    queryFn: async () => {
      let b = supabase.from(table as never).select("*");
      if (filter) for (const [k, v] of Object.entries(filter)) b = (b as any).eq(k, v);
      const { data, error } = await (b as any).order(orderBy, { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(initialForm);

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await (supabase.from(table as never) as any).insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Created");
      setForm(initialForm); setOpen(false);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as never) as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<T[]>(queryKey);
      qc.setQueryData<T[]>(queryKey, (cur) => (cur ?? []).filter((r) => r.id !== id));
      return { prev };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Deleted"),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...initialForm, ...form };
    for (const f of fields) {
      if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "") {
        payload[f.key] = Number(payload[f.key]);
      }
      if (payload[f.key] === "") payload[f.key] = null;
    }
    createMut.mutate(payload);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    deleteMut.mutate(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{rows.length} record{rows.length === 1 ? "" : "s"}</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add {title}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}{f.required && " *"}</Label>
                    {f.type === "select" ? (
                      <select
                        required={f.required}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={(form[f.key] as string) ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <Input
                        type={f.type ?? "text"}
                        required={f.required}
                        value={(form[f.key] as string | number) ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
                <DialogFooter>
                  <Button type="submit" disabled={createMut.isPending} className="gap-2">
                    {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((c) => <th key={String(c.key)} className="text-left px-4 py-3 font-medium">{c.label}</th>)}
                {canDelete && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length + 1} className="p-0"><TableSkeleton rows={5} cols={columns.length + (canDelete ? 1 : 0)} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">No records yet</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-4 py-3">
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key as string] ?? "—")}
                    </td>
                  ))}
                  {canDelete && (
                    <td className="px-2 py-2">
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
