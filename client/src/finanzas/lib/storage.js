export const STORAGE_KEY = 'kabin-finanzas-v1'
export const SESSION_KEY = 'kabin-finanzas-session'
export const MAX_ACCOUNTS = 5

export function emptyLedger() {
  return {
    creditos: [],
    deudas: [],
    pagos: [],
    ingresos: [],
    ahorros: [],
    prestamos: [],
    prestamoDisponible: 0,
    history: [],
    closedMonths: [],
    periodKey: null,
  }
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { accounts: [] }
    const parsed = JSON.parse(raw)
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    }
  } catch {
    return { accounts: [] }
  }
}

export function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadSessionId() {
  return sessionStorage.getItem(SESSION_KEY)
}

export function saveSessionId(accountId) {
  if (accountId) sessionStorage.setItem(SESSION_KEY, accountId)
  else sessionStorage.removeItem(SESSION_KEY)
}
