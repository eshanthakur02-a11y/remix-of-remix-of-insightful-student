import { useMemo, useState, type ReactNode } from "react";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { exportCSV } from "@/lib/csv-export";

export type DTColumn<T> = {
  key: string;
  label: string;
  get?: (row: T) => unknown;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id?: string | number }>({
  rows, columns, loading, pageSize = 10, searchKeys, filename = "export",
  toolbar, emptyTitle = "No records yet", emptyDescription, onRowClick,
}: {
  rows: T[];
  columns: DTColumn<T>[];
  loading?: boolean;
  pageSize?: number;
  searchKeys?: (keyof T | string)[];
  filename?: string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    const keys = (searchKeys ?? columns.map((c) => c.key)) as string[];
    return rows.filter((r) =>
      keys.some((k) => String((r as Record<string, unknown>)[k] ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q, searchKeys, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => exportCSV(filename, filtered as Record<string, unknown>[], columns.map((c) => ({ key: c.key, label: c.label, get: c.get as never })))}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`text-left px-4 py-3 font-medium ${c.className ?? ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="p-0"><TableSkeleton rows={5} cols={columns.length} /></td></tr>
              ) : slice.length === 0 ? (
                <tr><td colSpan={columns.length}><EmptyState title={emptyTitle} description={emptyDescription} /></td></tr>
              ) : slice.map((row, i) => (
                <tr
                  key={(row.id as string | number) ?? i}
                  className={`border-t border-border ${onRowClick ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String(c.get ? c.get(row) ?? "—" : (row as Record<string, unknown>)[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Prev</Button>
              <span>Page {safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
