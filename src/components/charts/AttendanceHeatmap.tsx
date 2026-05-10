export function AttendanceHeatmap() {
  // 7 cols x 12 rows (weeks) — deterministic synthetic data
  const cells = Array.from({ length: 7 * 12 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.7) + Math.cos(i * 0.3)) / 2; // 0..1
    return v;
  });
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground py-1">
          {days.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-rows-7 grid-flow-col gap-1.5">
          {cells.map((v, i) => (
            <div
              key={i}
              className="aspect-square rounded-[4px]"
              style={{
                background: `color-mix(in oklab, var(--color-primary) ${Math.round(v * 90 + 10)}%, transparent)`,
              }}
              title={`Week ${Math.floor(i / 7) + 1}: ${Math.round(v * 100)}%`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        Less
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((v, i) => (
          <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--color-primary) ${v * 100}%, transparent)` }} />
        ))}
        More
      </div>
    </div>
  );
}
