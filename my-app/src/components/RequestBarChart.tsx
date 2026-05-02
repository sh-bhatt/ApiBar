import type { DailyRequestVolume } from '../api/types'

type Props = {
  days: DailyRequestVolume[]
}

export function RequestBarChart({ days }: Props) {
  const max = Math.max(...days.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-4 font-mono text-xs text-zinc-400">Requests (7 days)</div>
      <div className="flex h-44 gap-2">
        {days.map((d) => {
          const pct = (d.count / max) * 100
          return (
            <div
              key={d.date}
              className="flex min-h-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div
                className="w-full rounded-sm bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                style={{ height: `${Math.max(pct, 6)}%` }}
                title={`${d.label}: ${d.count.toLocaleString()}`}
              />
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
