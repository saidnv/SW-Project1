export default function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px] text-[var(--fnz-muted)]">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fnz-input)]">
        <div
          className="h-full rounded-full bg-[var(--fnz-success)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
