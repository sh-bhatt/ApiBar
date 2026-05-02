import type { UsageLogDto } from '../hooks/useMeterflowApi'

type Props = {
  entries: UsageLogDto[]
}

function statusTone(status: number) {
  if (status >= 500) return 'text-rose-400'
  if (status >= 400) return 'text-amber-400'
  if (status >= 300) return 'text-sky-400'
  return 'text-emerald-400'
}

export function RequestLogTable({ entries }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 font-mono text-xs text-zinc-400">
        Recent requests
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-2 font-normal">Time</th>
              <th className="px-4 py-2 font-normal">Method</th>
              <th className="px-4 py-2 font-normal">Path</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Latency</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No requests logged yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-zinc-800/80 last:border-0 hover:bg-zinc-900/40"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                    {new Date(e.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2 text-emerald-300/90">{e.method}</td>
                  <td className="max-w-[240px] truncate px-4 py-2 text-zinc-300">{e.path}</td>
                  <td className={`px-4 py-2 tabular-nums ${statusTone(e.statusCode)}`}>
                    {e.statusCode}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-400">{e.latencyMs} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
