export default function ProgressBar({ value, label, tone = 'default' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const light = tone === 'light'
  return (
    <div>
      <div className={`mb-1.5 flex items-center justify-between text-[12px] ${light ? 'text-white/75' : 'text-[var(--fnz-muted)]'}`}>
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${light ? 'bg-white/20' : 'bg-[var(--fnz-input)]'}`}>
        <div
          className={`h-full rounded-full transition-all ${light ? 'bg-white' : 'bg-[var(--fnz-success)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
