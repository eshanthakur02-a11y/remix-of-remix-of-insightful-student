export function StatCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="h-3 w-20 rounded bg-muted/60 animate-pulse mb-3" />
      <div className="h-7 w-24 rounded bg-muted/60 animate-pulse" />
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="glass-card p-5">
      <div className="h-4 w-40 rounded bg-muted/60 animate-pulse mb-4" />
      <div className="rounded-lg bg-muted/40 animate-pulse" style={{ height }} />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass-card p-5">
      <div className="h-4 w-40 rounded bg-muted/60 animate-pulse mb-4" />
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-full bg-muted/60 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-muted/60 animate-pulse" />
              <div className="h-2.5 w-1/3 rounded bg-muted/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
