import { formatDate, formatDay } from '../lib/dates'
import { formatSoles } from '../lib/money'
import {
  isLoanCollected,
  loanDueState,
  loanInterestAmount,
  loanOwed,
  loanPaidAmount,
  loanTotal,
  pendingLoanClaim,
} from '../lib/prestamos'
import AmountBadge from './AmountBadge'
import ProgressBar from './ProgressBar'
import { btnPrimary, card } from './ui'

function dueBadgeClass(key) {
  if (key === 'collected') return 'bg-emerald-50 text-[var(--fnz-success)]'
  if (key === 'overdue' || key === 'today') return 'bg-rose-50 text-[var(--fnz-danger)]'
  if (key === 'tomorrow') return 'bg-amber-50 text-[var(--fnz-warn)]'
  return 'bg-[var(--fnz-input)] text-[var(--fnz-muted)]'
}

export function ReceivedLoanDebtRow({ loan, onClaim, amounts }) {
  const owed = loanOwed(loan)
  const total = loanTotal(loan)
  const paid = loanPaidAmount(loan)
  const pct = total > 0 ? (paid / total) * 100 : 0
  const due = loanDueState(loan)
  const pending = pendingLoanClaim(loan)
  const rejected = [...(loan.claims || [])].reverse().find((claim) => claim.status === 'rejected')
  const interest = loanInterestAmount(loan)

  return (
    <li className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">
            Te prestó {loan.lenderUsername}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--fnz-muted)]">
            <span className="rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fnz-accent)]">
              Préstamo
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueBadgeClass(due.key)}`}>
              {due.label}
            </span>
          </p>
        </div>
        <AmountBadge amount={owed} amounts={amounts} />
      </div>

      {loan.image ? (
        <img src={loan.image} alt="" className="mt-3 h-20 w-20 rounded-2xl object-cover" />
      ) : null}

      <p className="mt-3 text-[15px] text-[var(--fnz-muted)]">
        Original {formatSoles(total)} · Pendiente {formatSoles(owed)}
      </p>
      <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">
        Prestado {formatSoles(loan.amount)}
        {loan.interest > 0 ? ` + ${loan.interest}% (${formatSoles(interest)})` : ' sin interés'}
        {loan.dueDate ? ` · hasta el ${formatDay(loan.dueDate)}` : ''}
      </p>
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
    </li>
  )
}

export function ReceivedLoanHistory({ loans }) {
  const history = (loans || []).filter((loan) => isLoanCollected(loan))
  if (!history.length) return null

  return (
    <div>
      <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">
        Préstamos ya pagados
      </h3>
      <ul className="space-y-2">
        {history.map((loan) => (
          <li key={loan.id} className="rounded-2xl bg-[var(--fnz-input)] p-4">
            <p className="text-[16px] font-semibold text-[var(--fnz-text)]">{loan.lenderUsername}</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--fnz-success)]">
              Pagado {formatSoles(loan.collectedAmount || loanTotal(loan))}
            </p>
            <p className="text-[13px] text-[var(--fnz-muted)]">Confirmado {formatDate(loan.collectedAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
