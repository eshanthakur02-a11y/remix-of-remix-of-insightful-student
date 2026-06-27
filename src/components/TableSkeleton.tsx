export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3 px-4 py-3 border-t border-border" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 rounded bg-muted/60 animate-pulse" style={{ width: `${60 + ((r + c) * 7) % 30}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
