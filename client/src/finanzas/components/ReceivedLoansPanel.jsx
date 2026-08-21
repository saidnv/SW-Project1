import { formatDate, formatDay } from '../lib/dates'
import { formatSoles } from '../lib/money'
import {
  isLoanCollected,
  loanDueState,
  loanOwed,
  loanPaidAmount,
  loanTotal,
  pendingLoanClaim,
} from '../lib/prestamos'
import ProgressBar from './ProgressBar'
import { btnPrimary, card } from './ui'

function dueBadgeClass(key) {
  if (key === 'collected') return 'bg-emerald-50 text-[var(--fnz-success)]'
  if (key === 'overdue' || key === 'today') return 'bg-rose-50 text-[var(--fnz-danger)]'
  if (key === 'tomorrow') return 'bg-amber-50 text-[var(--fnz-warn)]'
  return 'bg-[var(--fnz-input)] text-[var(--fnz-muted)]'
}

export default function ReceivedLoansPanel({ loans, onClaim }) {
  const open = loans.filter((loan) => !isLoanCollected(loan))
  const history = loans.filter((loan) => isLoanCollected(loan))
  if (!loans.length) return null

  return (
    <div className="space-y-3">
      <div>
        <h3 className="mb-1 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">
          Préstamos por pagar
        </h3>
        <p className="px-1 text-[14px] leading-relaxed text-[var(--fnz-muted)]">
          Esto no es un pago mensual. Sigue visible aunque pase el mes, hasta la fecha de pago o
          hasta que quien te prestó confirme.
        </p>
      </div>
      {open.map((loan) => {
        const owed = loanOwed(loan)
        const total = loanTotal(loan)
        const paid = loanPaidAmount(loan)
        const pct = total > 0 ? (paid / total) * 100 : 0
        const due = loanDueState(loan)
        const pending = pendingLoanClaim(loan)
        const rejected = [...(loan.claims || [])].reverse().find((claim) => claim.status === 'rejected')
        return (
          <div key={loan.id} className={card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[17px] font-semibold text-[var(--fnz-text)]">Te prestó {loan.lenderUsername}</p>
                <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dueBadgeClass(due.key)}`}>
                  {due.label}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[22px] font-bold tabular-nums text-[var(--fnz-accent)]">
              {formatSoles(owed)}
              <span className="text-[15px] font-medium text-[var(--fnz-muted)]"> de {formatSoles(total)}</span>
            </p>
            <p className="text-[13px] text-[var(--fnz-muted)]">Hasta el {formatDay(loan.dueDate)}</p>
            {total > 0 ? (
              <div className="mt-3">
                <ProgressBar value={pct} label={`Pagado ${formatSoles(paid)}`} />
              </div>
            ) : null}
            {pending ? (
              <p className="mt-3 text-[14px] font-medium text-[var(--fnz-warn)]">
                Pago de {formatSoles(pending.amount)} en espera de que {loan.lenderUsername} lo confirme.
              </p>
            ) : null}
            {!pending && rejected ? (
              <p className="mt-3 text-[14px] text-[var(--fnz-danger)]">
                El último pago fue rechazado. Puedes registrar otro.
              </p>
            ) : null}
            {loan.notes ? <p className="mt-2 text-[14px] leading-relaxed text-[var(--fnz-text)]">{loan.notes}</p> : null}
            {!pending ? (
              <button type="button" onClick={() => onClaim(loan)} className={`${btnPrimary} mt-4 w-full sm:w-auto`}>
                Ya pagué o pago parcial
              </button>
            ) : null}
          </div>
        )
      })}
      {!open.length ? (
        <p className="px-1 text-[14px] text-[var(--fnz-muted)]">No tienes préstamos pendientes con usuarios del sistema.</p>
      ) : null}

      {history.length ? (
        <div className="pt-2">
          <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">
            Historial de préstamos pagados
          </h3>
          <ul className="space-y-2">
            {history.map((loan) => (
              <li key={loan.id} className="rounded-2xl bg-[var(--fnz-input)] p-4">
                <p className="text-[16px] font-semibold text-[var(--fnz-text)]">{loan.lenderUsername}</p>
                <p className="mt-1 text-[15px] font-semibold text-[var(--fnz-success)]">
                  Pagado {formatSoles(loan.collectedAmount || loanTotal(loan))}
                </p>
                <p className="text-[13px] text-[var(--fnz-muted)]">
                  Confirmado {formatDate(loan.collectedAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
