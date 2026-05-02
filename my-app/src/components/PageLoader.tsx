export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500"
        role="status"
        aria-label={label}
      />
      <p className="font-mono text-xs text-zinc-500">{label}…</p>
    </div>
  )
}
