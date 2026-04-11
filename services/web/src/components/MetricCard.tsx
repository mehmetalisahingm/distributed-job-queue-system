interface MetricCardProps {
  label: string;
  value: number;
  accent: string;
}

export function MetricCard({ label, value, accent }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-card/90 p-5 shadow-glow backdrop-blur">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className={`mt-4 text-4xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
