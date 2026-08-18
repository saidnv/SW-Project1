import { formatSoles } from '../lib/money'
import { cardColorOf } from '../lib/kinds'

function darken(hex, amount = 28) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length !== 6) return '#0f172a'
  const nums = [0, 2, 4].map((index) => Math.max(0, Number.parseInt(raw.slice(index, index + 2), 16) - amount))
  return `#${nums.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export default function PlasticCard({ name, amount, color, actions, children }) {
  const base = cardColorOf({ color })
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)]"
      style={{ background: `linear-gradient(135deg, ${base} 0%, ${darken(base)} 100%)` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-black/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 shadow-inner" />
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white/80" strokeWidth="1.6">
            <path d="M8 8c2.2 2.2 2.2 5.8 0 8M11 6c3.4 3.4 3.4 8.6 0 12M14 4c4.6 4.6 4.6 11.4 0 16" />
          </svg>
        </div>
        {actions}
      </div>
      <p className="relative mt-7 text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">Tarjeta</p>
      <p className="relative mt-1 truncate text-[22px] font-semibold tracking-wide">{name}</p>
      {amount != null ? (
        <p className="relative mt-3 text-[20px] font-bold tabular-nums">{formatSoles(amount)}</p>
      ) : null}
      {children ? <div className="relative mt-4">{children}</div> : null}
    </div>
  )
}
