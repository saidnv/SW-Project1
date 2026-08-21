import { daysUntil, formatDay } from './dates'
import { formatSoles } from './money'

export function isLoanCollected(loan) {
  return Boolean(loan?.collected)
}

export function openLoans(prestamos) {
  return (prestamos || []).filter((loan) => !isLoanCollected(loan))
}

export function loanInterestAmount(loan) {
  const amount = Number(loan?.amount) || 0
  const rate = Number(loan?.interest) || 0
  return Number(((amount * rate) / 100).toFixed(2))
}

export function loanTotal(loan) {
  const amount = Number(loan?.amount) || 0
  return Number((amount + loanInterestAmount(loan)).toFixed(2))
}

export function loanDueState(loan, from = new Date()) {
  if (isLoanCollected(loan)) {
    return { days: null, key: 'collected', label: 'Cobrado' }
  }
  const days = daysUntil(loan?.dueDate, from)
  if (days === null) return { days: null, key: 'none', label: 'Sin fecha' }
  if (days < 0) {
    const overdue = Math.abs(days)
    return {
      days,
      key: 'overdue',
      label: overdue === 1 ? 'Venció ayer' : `Venció hace ${overdue} días`,
    }
  }
  if (days === 0) return { days, key: 'today', label: 'Vence hoy' }
  if (days === 1) return { days, key: 'tomorrow', label: 'Vence mañana' }
  return { days, key: 'later', label: `Vence el ${formatDay(loan.dueDate)}` }
}

export function isAlertDue(loan, from = new Date()) {
  const key = loanDueState(loan, from).key
  return key === 'tomorrow' || key === 'today' || key === 'overdue'
}

export function dueAlertLoans(loans, from = new Date()) {
  return (loans || [])
    .filter((loan) => isAlertDue(loan, from))
    .sort((a, b) => (daysUntil(a.dueDate, from) ?? 99) - (daysUntil(b.dueDate, from) ?? 99))
}

export function loanPoolDelta(loan) {
  if (!isLoanCollected(loan)) return 0
  const stored = Number(loan.poolDelta)
  if (Number.isFinite(stored) && stored >= 0) return stored
  return loanInterestAmount(loan)
}

export function poolAfterRemovingLoan(disponible, loan) {
  const pool = Number(disponible) || 0
  if (!isLoanCollected(loan)) return pool
  return Number(Math.max(0, pool - loanPoolDelta(loan)).toFixed(2))
}

export function remainingToLend(disponible, prestamos) {
  const pool = Number(disponible) || 0
  if (pool <= 0) return 0
  const lent = openLoans(prestamos).reduce((total, loan) => total + (Number(loan.amount) || 0), 0)
  return Number((pool - lent).toFixed(2))
}

export function isLinkedLoan(loan) {
  return Boolean(loan?.linked && (loan.borrowerId || loan.borrowerUsername))
}

export function loanOwed(loan) {
  if (isLoanCollected(loan)) return 0
  const total = loanTotal(loan)
  const paid = (loan.paymentHistory || []).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  if (loan.remainingAmount != null && Number.isFinite(Number(loan.remainingAmount))) {
    return Number(Math.max(0, Number(loan.remainingAmount)).toFixed(2))
  }
  return Number(Math.max(0, total - paid).toFixed(2))
}

export function loanPaidAmount(loan) {
  return Number((loanTotal(loan) - loanOwed(loan)).toFixed(2))
}

export function pendingLoanClaim(loan) {
  return (loan?.claims || []).find((claim) => claim.status === 'pending') || null
}

export function openReceivedLoans(list) {
  return (list || []).filter((loan) => isLinkedLoan(loan) && !isLoanCollected(loan))
}

export function dueHeadline(loan) {
  const state = loanDueState(loan)
  const total = formatSoles(loanTotal(loan))
  return `${loan.name} · ${total} · ${state.label}`
}
