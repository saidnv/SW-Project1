import { getKabinTip, getPrimaryKabinMessage } from '../lib/kabin'
import { useFinanzas } from '../context/FinanzasContext'
import { card } from './ui'

const TONE = {
  info: 'bg-[var(--fnz-input)] text-[var(--fnz-text)]',
  ok: 'bg-emerald-50 text-emerald-800',
  warn: 'bg-amber-50 text-amber-800',
  alert: 'bg-rose-50 text-rose-800',
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3c-1.2 0-2.2.9-2.2 2.1 0 .6.2 1.1.6 1.5L12 8l1.6-1.4c.4-.4.6-.9.6-1.5C14.2 3.9 13.2 3 12 3Z" />
      <path d="M8.5 10.5 7 20h10l-1.5-9.5" strokeLinejoin="round" />
      <path d="M9 14h6" strokeLinecap="round" />
    </svg>
  )
}

function shouldShowMessage(message) {
  if (!message) return false
  if (message.important) return true
  if (message.id === 'welcome' || message.tone === 'info') return false
  return true
}

export default function KabinPanel({ section }) {
  const { kabin } = useFinanzas()
  const tip = getKabinTip(section)
  const message = getPrimaryKabinMessage(kabin.messages)
  const alert = shouldShowMessage(message) ? message : null

  return (
    <aside
      className={`${card} border border-[var(--fnz-accent)]/15 bg-gradient-to-b from-[var(--fnz-accent-soft)]/50 to-[var(--fnz-card)]`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--fnz-accent)] text-[20px] font-bold text-white shadow-[var(--fnz-btn-shadow)]">
            K
          </div>
          <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--fnz-card)] text-[var(--fnz-accent)] shadow-[var(--fnz-shadow)]">
            <GuideIcon />
          </span>
        </div>
        <div className="min-w-0 pt-0.5">
          <span className="inline-flex rounded-full bg-[var(--fnz-accent)]/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[var(--fnz-accent)] uppercase">
            Tu guía
          </span>
          <h2 className="mt-1.5 text-[22px] font-bold tracking-tight text-[var(--fnz-text)]">Kabin</h2>
          <p className="mt-0.5 text-[13px] font-medium text-[var(--fnz-muted)]">Te ayuda con tus finanzas en soles</p>
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-[var(--fnz-card)]/80 px-3.5 py-3 text-[14px] leading-relaxed text-[var(--fnz-text)]">
        {tip}
      </p>

      {alert && (
        <div className={`mt-3 rounded-2xl px-3.5 py-3 text-[14px] ${TONE[alert.tone]}`}>
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-1 leading-snug opacity-90">{alert.body}</p>
        </div>
      )}
    </aside>
  )
}
