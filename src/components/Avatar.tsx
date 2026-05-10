const palette = [
  ["#60a5fa", "#22d3ee"],
  ["#a78bfa", "#f472b6"],
  ["#34d399", "#22d3ee"],
  ["#fbbf24", "#f472b6"],
  ["#f87171", "#fb923c"],
  ["#38bdf8", "#a78bfa"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, className = "h-9 w-9" }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [a, b] = palette[hash(name) % palette.length];
  return (
    <div
      className={`${className} shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border border-border`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
