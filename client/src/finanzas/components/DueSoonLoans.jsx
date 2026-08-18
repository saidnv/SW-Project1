import { Link } from 'react-router-dom'
import { formatDay } from '../lib/dates'
import { formatSoles } from '../lib/money'
import { dueAlertLoans, loanDueState, loanTotal } from '../lib/prestamos'

function toneFor(key) {
  if (key === 'overdue') {
    return {
      wrap: 'from-rose-500/15 via-[var(--fnz-card)] to-[var(--fnz-card)] ring-rose-200',
      bar: 'bg-[var(--fnz-danger)]',
      badge: 'bg-rose-50 text-[var(--fnz-danger)]',
      amount: 'text-[var(--fnz-danger)]',
      title: 'Préstamos vencidos',
    }
  }
  if (key === 'today') {
    return {
      wrap: 'from-orange-400/18 via-[var(--fnz-card)] to-[var(--fnz-card)] ring-orange-200',
      bar: 'bg-orange-500',
      badge: 'bg-orange-50 text-orange-700',
      amount: 'text-orange-600',
      title: 'Préstamos que vencen hoy',
    }
  }
  return {
    wrap: 'from-amber-400/20 via-[var(--fnz-card)] to-[var(--fnz-card)] ring-amber-200',
    bar: 'bg-[var(--fnz-warn)]',
    badge: 'bg-amber-50 text-[var(--fnz-warn)]',
    amount: 'text-[var(--fnz-warn)]',
    title: 'Préstamos a un día de vencer',
  }
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 8.2v4.2l2.6 1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DueSoonLoans({ prestamos }) {
  const alerts = dueAlertLoans(prestamos)
  if (!alerts.length) return null

  const lead = alerts[0]
  const leadState = loanDueState(lead)
  const tone = toneFor(leadState.key)

  return (
    <section className={`fnz-due-pulse relative overflow-hidden rounded-[22px] bg-gradient-to-br ${tone.wrap} p-4 shadow-[var(--fnz-shadow)] ring-1 sm:p-5`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--fnz-muted)]">
            <span className={tone.amount}>
              <ClockIcon />
            </span>
            {tone.title}
          </p>
          <p className="mt-1 text-[14px] text-[var(--fnz-muted)]">
            Revisa la constancia y cobra a tiempo. Esto no se mezcla con tus ahorros.
          </p>
        </div>
        <Link to="/finanzas/prestamos" className="shrink-0 text-[14px] font-semibold text-[var(--fnz-accent)]">
          Ver todos
        </Link>
      </div>

      <ul className="mt-4 space-y-3 pl-2">
        {alerts.map((loan) => {
          const state = loanDueState(loan)
          const itemTone = toneFor(state.key)
          return (
            <li key={loan.id}>
              <Link
                to="/finanzas/prestamos"
                className="flex gap-3 rounded-2xl bg-[var(--fnz-card)]/80 p-3 shadow-[var(--fnz-shadow)] ring-1 ring-black/5 transition hover:-translate-y-0.5"
              >
                {loan.image ? (
                  <img src={loan.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--fnz-accent-soft)] text-[18px] font-bold text-[var(--fnz-accent)]">
                    {(loan.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[16px] font-semibold text-[var(--fnz-text)]">{loan.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${itemTone.badge}`}>
                      {state.label}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-[20px] font-bold tabular-nums ${itemTone.amount}`}>{formatSoles(loanTotal(loan))}</p>
                  <p className="text-[12px] text-[var(--fnz-muted)]">
                    Prestado {formatSoles(loan.amount)}
                    {loan.interest > 0 ? ` + ${loan.interest}%` : ''} · {formatDay(loan.dueDate)}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
