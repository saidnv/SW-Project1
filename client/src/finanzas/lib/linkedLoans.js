import { samePerson } from './sharedAhorro'
import { isLinkedLoan, loanTotal } from './prestamos'

export function isLoanLender(loan, account) {
  if (!loan || !account) return false
  return samePerson({ id: loan.lenderId, username: loan.lenderUsername }, account)
}

export function isLoanBorrower(loan, account) {
  if (!loan || !account) return false
  return samePerson({ id: loan.borrowerId, username: loan.borrowerUsername }, account)
}

export function makeLinkedLoan(item, lender, borrower) {
  return {
    ...item,
    linked: true,
    lenderId: lender.id,
    lenderUsername: lender.username,
    borrowerId: borrower.id,
    borrowerUsername: borrower.username,
    name: borrower.username,
    remainingAmount: loanTotal(item),
    claims: item.claims || [],
    paymentHistory: item.paymentHistory || [],
  }
}

function upsertList(list, item) {
  const current = Array.isArray(list) ? list : []
  const exists = current.some((row) => row.id === item.id)
  return exists ? current.map((row) => (row.id === item.id ? item : row)) : [item, ...current]
}

function stripList(list, id) {
  return (list || []).filter((row) => row.id !== id)
}

export function upsertRecibido(ledger, loan) {
  return {
    ...ledger,
    prestamosRecibidos: upsertList(ledger.prestamosRecibidos, loan),
  }
}

export function stripRecibido(ledger, id) {
  return {
    ...ledger,
    prestamosRecibidos: stripList(ledger.prestamosRecibidos, id),
  }
}

export function upsertPrestamo(ledger, loan) {
  return {
    ...ledger,
    prestamos: upsertList(ledger.prestamos, loan),
  }
}

export function syncLinkedLoansInStore(store, writerId) {
  const writer = store.accounts.find((item) => item.id === writerId)
  if (!writer?.data) return store
  const lent = (writer.data.prestamos || []).filter(isLinkedLoan)
  const received = writer.data.prestamosRecibidos || []

  return {
    ...store,
    accounts: store.accounts.map((account) => {
      if (account.id === writerId) return account
      let data = account.data
      for (const loan of lent) {
        const copy = structuredClone(loan)
        if (isLoanBorrower(loan, account)) data = upsertRecibido(data, copy)
        else if ((data.prestamosRecibidos || []).some((row) => row.id === loan.id)) {
          data = stripRecibido(data, loan.id)
        }
      }
      for (const loan of received) {
        if (isLoanLender(loan, account)) data = upsertPrestamo(data, structuredClone(loan))
      }
      return { ...account, data }
    }),
  }
}

export function applyLinkedLoanDeletions(store, writerId, previousPrestamos) {
  const writer = store.accounts.find((item) => item.id === writerId)
  if (!writer) return store
  const nextIds = new Set((writer.data.prestamos || []).map((item) => item.id))
  const deleted = (previousPrestamos || []).filter(
    (item) => isLinkedLoan(item) && isLoanLender(item, writer) && !nextIds.has(item.id),
  )
  if (!deleted.length) return store
  return {
    ...store,
    accounts: store.accounts.map((account) => {
      if (account.id === writerId) return account
      let data = account.data
      for (const loan of deleted) data = stripRecibido(data, loan.id)
      return { ...account, data }
    }),
  }
}
