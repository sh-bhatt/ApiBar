type MetricCardProps = {
  label: string
  value: string
  hint?: string
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl text-zinc-50 tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-1 font-mono text-[11px] text-zinc-600">{hint}</div>
      ) : null}
    </div>
  )
}
