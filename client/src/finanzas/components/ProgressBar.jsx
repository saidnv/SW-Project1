export default function ProgressBar({ value, label, tone = 'default' }) {
  const raw = Number(value)
  const pct = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0))
  const light = tone === 'light'
  return (
    <div className="min-w-0 w-full">
      <div className={`mb-1.5 flex items-center justify-between gap-3 text-[12px] ${light ? 'text-white/75' : 'text-[var(--fnz-muted)]'}`}>
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${light ? 'bg-white/20' : 'bg-[var(--fnz-input)]'}`}>
        <div
          className={`absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-500 ease-out ${
            light ? 'bg-white' : 'bg-[var(--fnz-success)]'
          }`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  )
}
