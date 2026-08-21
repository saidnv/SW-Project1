import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ADMIN_PIN, ADMIN_USERNAME, isAdminUsername } from '../lib/admin'
import { addMonths, isMonthCloseWindow, nowIso } from '../lib/dates'
import { createId } from '../lib/ids'
import { getKabinAdvice } from '../lib/kabin'
import { sumAmounts } from '../lib/money'
import { isPagoPaid, paidPagos } from '../lib/pagos'
import { hydrateLedger, inPeriod, openPeriod } from '../lib/period'
import { HIDEABLE_IDS, normalizeHiddenSections } from '../lib/sections'
import { isTarjeta, kindOf } from '../lib/kinds'
import {
  clearApiToken,
  fetchAdminAccounts,
  fetchDirectory,
  fetchMe,
  isLedgerEmpty,
  loginAccount,
  logoutAccount,
  pingApi,
  registerAccount,
  saveLedger,
  deleteAdminAccount,
} from '../lib/api'
import {
  emptyLedger,
  loadSessionId,
  loadStore,
  MAX_ACCOUNTS,
  saveSessionId,
  saveStore,
} from '../lib/storage'
import {
  applySharedDeletions,
  isAhorroOwner,
  makeSharedAhorro,
  syncSharedAhorrosInStore,
  withAddedMembers,
} from '../lib/sharedAhorro'
import { applyLinkedLoanDeletions, makeLinkedLoan, syncLinkedLoansInStore } from '../lib/linkedLoans'
import { isLinkedLoan, loanInterestAmount, loanOwed, loanTotal, openLoans, pendingLoanClaim, poolAfterRemovingLoan, receivedLoanDebtTotal } from '../lib/prestamos'
import { FinanzasContext } from './FinanzasContext'

function withHydrated(account) {
  if (!account) return account
  return { ...account, data: hydrateLedger(account.data) }
}

function cloneLedger(ledger) {
  return structuredClone(ledger)
}

function periodRemainder(ledger) {
  const period = openPeriod(ledger)
  const ingresos = sumAmounts(ledger.ingresos.filter((row) => inPeriod(row, period)))
  const pagos = sumAmounts(paidPagos(ledger.pagos.filter((row) => inPeriod(row, period))))
  return Number((ingresos - pagos).toFixed(2))
}

function applyMonthClose(ledger) {
  const period = openPeriod(ledger)
  const periodPagos = ledger.pagos.filter((row) => inPeriod(row, period))
  const periodIngresos = ledger.ingresos.filter((row) => inPeriod(row, period))
  const closedAt = nowIso()
  const nextKey = addMonths(period, 1)
  const snapshot = {
    id: createId(),
    monthKey: period,
    closedAt,
    pagos: periodPagos.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      deudaId: item.deudaId || null,
      paid: true,
      paidAt: item.paidAt || closedAt,
      appliedAmount: item.appliedAmount || 0,
      kind: item.kind || null,
      color: item.color || null,
    })),
    deudas: ledger.deudas.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      originalAmount: item.originalAmount,
      kind: item.kind || null,
      color: item.color || null,
      creditoId: item.creditoId || null,
    })),
    ingresos: periodIngresos.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
    })),
    totals: {
      pagos: sumAmounts(periodPagos),
      ingresos: sumAmounts(periodIngresos),
      deudas: Number((sumAmounts(ledger.deudas) + receivedLoanDebtTotal(ledger.prestamosRecibidos)).toFixed(2)),
      ahorros: sumAmounts(ledger.ahorros),
      remainder: Number((sumAmounts(periodIngresos) - sumAmounts(periodPagos)).toFixed(2)),
    },
  }
  const carriedPagos = periodPagos.map((item) => ({
    ...item,
    id: createId(),
    periodKey: nextKey,
    paid: false,
    paidAt: null,
    appliedAmount: 0,
    createdAt: closedAt,
    updatedAt: closedAt,
  }))
  return {
    ...ledger,
    closedMonths: [snapshot, ...(ledger.closedMonths || [])],
    periodKey: nextKey,
    pagos: [...carriedPagos, ...ledger.pagos.filter((row) => !inPeriod(row, period))],
    ingresos: ledger.ingresos.filter((row) => !inPeriod(row, period)),
  }
}

function makeAhorroDeposit(amount, source, date = nowIso(), byUsername = '') {
  return {
    id: createId(),
    amount: Number(amount) || 0,
    source: String(source || '').trim(),
    date,
    ...(byUsername ? { byUsername } : {}),
  }
}

function applySurplus(ledger, amount, ahorroId, extraName, byUsername = '') {
  if (ahorroId) {
    const deposit = makeAhorroDeposit(amount, 'Sobrante del mes', nowIso(), byUsername)
    return {
      ...ledger,
      ahorros: ledger.ahorros.map((item) =>
        item.id === ahorroId
          ? {
              ...item,
              amount: Number((item.amount + amount).toFixed(2)),
              history: [...(item.history || []), deposit],
              updatedAt: nowIso(),
            }
          : item,
      ),
    }
  }
  const createdAt = nowIso()
  const item = {
    id: createId(),
    name: extraName || 'Ahorro del mes',
    amount,
    goalAmount: 0,
    monthlyTarget: 0,
    image: '',
    link: '',
    history: amount > 0 ? [makeAhorroDeposit(amount, 'Sobrante del mes', createdAt, byUsername)] : [],
    createdAt,
    updatedAt: createdAt,
  }
  return { ...ledger, ahorros: [item, ...ledger.ahorros] }
}

function closeMonthGuard(ledger) {
  const period = openPeriod(ledger)
  if ((ledger.closedMonths || []).some((month) => month.monthKey === period)) {
    return { ok: false, error: 'Este mes ya está cerrado.' }
  }
  if (!isMonthCloseWindow(period)) {
    return { ok: false, error: 'El mes se cierra en los últimos días.' }
  }
  const periodPagos = ledger.pagos.filter((row) => inPeriod(row, period))
  if (!periodPagos.length) {
    return { ok: false, error: 'Agrega los pagos del mes antes de cerrarlo.' }
  }
  const pending = periodPagos.filter((row) => !isPagoPaid(row))
  if (pending.length) {
    return { ok: false, error: 'Aún hay pagos pendientes.' }
  }
  return { ok: true }
}

function localAccountByUsername(username) {
  return loadStore().accounts.find(
    (item) => item.username.toLowerCase() === String(username || '').toLowerCase(),
  )
}

function withLocalAdmin(store) {
  const accounts = store.accounts.map((item) =>
    isAdminUsername(item.username) ? { ...item, username: ADMIN_USERNAME, pin: ADMIN_PIN } : item,
  )
  if (accounts.some((item) => isAdminUsername(item.username))) {
    return { accounts }
  }
  return {
    accounts: [
      {
        id: createId(),
        username: ADMIN_USERNAME,
        pin: ADMIN_PIN,
        createdAt: nowIso(),
        data: emptyLedger(),
      },
      ...accounts,
    ],
  }
}

export default function FinanzasProvider({ children }) {
  const [store, setStore] = useState(loadStore)
  const [sessionId, setSessionId] = useState(loadSessionId)
  const [surplusPrompt, setSurplusPrompt] = useState(null)
  const [ready, setReady] = useState(false)
  const [usingApi, setUsingApi] = useState(false)
  const usingApiRef = useRef(false)
  const saveQueue = useRef(Promise.resolve())
  const pendingCloseRef = useRef(false)
  const mutationGen = useRef(0)

  const persist = useCallback((nextStore, nextSessionId = sessionId) => {
    mutationGen.current += 1
    setStore(nextStore)
    setSessionId(nextSessionId)
    saveSessionId(nextSessionId)
    if (!usingApiRef.current) {
      saveStore(nextStore)
      return
    }
    const account = nextStore.accounts.find((item) => item.id === nextSessionId)
    if (!account) return
    saveQueue.current = saveQueue.current
      .then(() => saveLedger(account.data))
      .catch((error) => {
        console.error(error)
      })
  }, [sessionId])

  const account = useMemo(() => {
    const raw = store.accounts.find((item) => item.id === sessionId) ?? null
    return withHydrated(raw)
  }, [store.accounts, sessionId])

  const updateLedger = useCallback(
    (updater) => {
      if (!account) return
      const current = hydrateLedger(cloneLedger(account.data))
      const next = hydrateLedger(updater(current) || current)
      let nextStore = {
        ...store,
        accounts: store.accounts.map((item) =>
          item.id === account.id ? { ...item, data: next } : item,
        ),
      }
      if (!usingApiRef.current) {
        nextStore = syncSharedAhorrosInStore(nextStore, account.id)
        nextStore = applySharedDeletions(nextStore, account.id, current.ahorros)
        nextStore = syncLinkedLoansInStore(nextStore, account.id)
        nextStore = applyLinkedLoanDeletions(nextStore, account.id, current.prestamos)
      }
      persist(nextStore)
      return next
    },
    [account, persist, store],
  )

  const createAccount = useCallback(
    async (username, pin) => {
      const name = username.trim()
      if (!name) return { ok: false, error: 'Escribe un nombre de usuario.' }
      if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'El PIN debe tener 4 dígitos.' }
      if (isAdminUsername(name)) return { ok: false, error: 'Ese nombre está reservado.' }

      if (usingApiRef.current) {
        try {
          const local = localAccountByUsername(name)
          const payload = await registerAccount(name, pin, local?.data)
          persist({ accounts: [withHydrated(payload.account)] }, payload.account.id)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }

      if (store.accounts.length >= MAX_ACCOUNTS) {
        return { ok: false, error: `Máximo de ${MAX_ACCOUNTS} cuentas.` }
      }
      if (store.accounts.some((item) => item.username.toLowerCase() === name.toLowerCase())) {
        return { ok: false, error: 'Ese nombre ya existe.' }
      }

      const nextAccount = {
        id: createId(),
        username: name,
        pin,
        createdAt: nowIso(),
        data: emptyLedger(),
      }
      persist({ accounts: [...store.accounts, nextAccount] }, nextAccount.id)
      return { ok: true }
    },
    [persist, store.accounts],
  )

  const login = useCallback(
    async (accountIdOrUsername, pin) => {
      if (usingApiRef.current) {
        try {
          const payload = await loginAccount(accountIdOrUsername, pin)
          let account = payload.account
          const local = localAccountByUsername(account.username)
          if (local?.data && isLedgerEmpty(account.data) && !isLedgerEmpty(local.data)) {
            const saved = await saveLedger(hydrateLedger(local.data))
            account = saved.account
          }
          persist({ accounts: [withHydrated(account)] }, account.id)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }

      const found =
        store.accounts.find((item) => item.id === accountIdOrUsername) ||
        store.accounts.find(
          (item) => item.username.toLowerCase() === String(accountIdOrUsername).toLowerCase(),
        )
      if (!found) return { ok: false, error: 'Cuenta no encontrada.' }
      if (found.pin !== pin) return { ok: false, error: 'PIN incorrecto.' }
      persist(store, found.id)
      return { ok: true }
    },
    [persist, store],
  )

  const logout = useCallback(() => {
    if (usingApiRef.current) {
      logoutAccount().catch(() => {})
      setStore({ accounts: [] })
    }
    setSessionId(null)
    saveSessionId(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const apiUp = await pingApi()
      if (cancelled) return
      if (apiUp) {
        usingApiRef.current = true
        setUsingApi(true)
        try {
          const payload = await fetchMe()
          if (cancelled) return
          const account = withHydrated(payload.account)
          setStore({ accounts: [account] })
          setSessionId(account.id)
          saveSessionId(account.id)
          if (!payload.account?.data?.periodKey) {
            saveLedger(account.data).catch((error) => console.error(error))
          }
        } catch {
          clearApiToken()
          setStore({ accounts: [] })
          setSessionId(null)
          saveSessionId(null)
        }
      } else {
        const next = withLocalAdmin(loadStore())
        saveStore(next)
        setStore(next)
      }
      setReady(true)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const addCredito = useCallback(
    ({ name, amount, kind, color }) => {
      const item = {
        id: createId(),
        name,
        amount,
        kind: kind || 'otros',
        color: kind === 'tarjeta' ? color || null : null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      updateLedger((ledger) => ({ ...ledger, creditos: [item, ...ledger.creditos] }))
    },
    [updateLedger],
  )

  const updateCredito = useCallback(
    (id, patch) => {
      updateLedger((ledger) => ({
        ...ledger,
        creditos: ledger.creditos.map((item) =>
          item.id === id
            ? {
                ...item,
                ...patch,
                color: (patch.kind ?? item.kind) === 'tarjeta' ? patch.color ?? item.color : null,
                updatedAt: nowIso(),
              }
            : item,
        ),
      }))
    },
    [updateLedger],
  )

  const removeCredito = useCallback(
    (id) => {
      updateLedger((ledger) => ({
        ...ledger,
        creditos: ledger.creditos.filter((row) => row.id !== id),
      }))
    },
    [updateLedger],
  )

  const addDeuda = useCallback(
    ({ name, amount, kind, color, creditoId }) => {
      updateLedger((ledger) => {
        let resolvedName = name
        let resolvedKind = kind || 'otros'
        let resolvedColor = kind === 'tarjeta' ? color || null : null

        if (creditoId && !resolvedName) {
          const credito = ledger.creditos.find((row) => row.id === creditoId)
          if (credito) {
            resolvedName = credito.name
            resolvedKind = kindOf(credito)
            resolvedColor = isTarjeta(credito) ? credito.color || null : null
          }
        }

        const item = {
          id: createId(),
          name: resolvedName,
          originalAmount: amount,
          amount,
          kind: resolvedKind,
          color: resolvedColor,
          creditoId: creditoId || null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        return { ...ledger, deudas: [item, ...ledger.deudas] }
      })
    },
    [updateLedger],
  )

  const updateDeuda = useCallback(
    (id, patch) => {
      updateLedger((ledger) => ({
        ...ledger,
        deudas: ledger.deudas.map((item) => {
          if (item.id !== id) return item
          const nextCreditoId = patch.creditoId ?? item.creditoId
          let nextName = patch.name ?? item.name
          let nextKind = patch.kind ?? item.kind
          let nextColor = (nextKind) === 'tarjeta' ? (patch.color ?? item.color) : null

          if (nextCreditoId && !nextName) {
            const credito = ledger.creditos.find((row) => row.id === nextCreditoId)
            if (credito) {
              nextName = credito.name
              nextKind = kindOf(credito)
              nextColor = isTarjeta(credito) ? credito.color || null : null
            }
          }

          const nextAmount = patch.amount ?? item.amount
          return {
            ...item,
            ...patch,
            name: nextName,
            kind: nextKind,
            color: nextColor,
            amount: nextAmount,
            originalAmount: Math.max(item.originalAmount, nextAmount),
            creditoId: nextCreditoId,
            updatedAt: nowIso(),
          }
        }),
        pagos: ledger.pagos.map((pago) => {
          if (pago.deudaId !== id) return pago
          return {
            ...pago,
            name: patch.name ?? pago.name,
            kind: patch.kind ?? pago.kind,
            color: (patch.kind ?? pago.kind) === 'tarjeta' ? patch.color ?? pago.color : null,
            updatedAt: nowIso(),
          }
        }),
      }))
    },
    [updateLedger],
  )

  const removeDeuda = useCallback(
    (id) => {
      updateLedger((ledger) => ({
        ...ledger,
        deudas: ledger.deudas.filter((row) => row.id !== id),
        pagos: ledger.pagos.map((pago) =>
          pago.deudaId === id ? { ...pago, deudaId: null } : pago,
        ),
      }))
    },
    [updateLedger],
  )

  const applyPaymentToDebt = useCallback((ledger, deudaId, amount, previousApplied = 0) => {
    if (!deudaId) return { ledger, applied: 0 }
    const deudas = ledger.deudas.map((deuda) => {
      if (deuda.id !== deudaId) return deuda
      const restored = deuda.amount + previousApplied
      const applied = Math.min(amount, restored)
      return {
        ...deuda,
        amount: Number((restored - applied).toFixed(2)),
        updatedAt: nowIso(),
      }
    })
    const deuda = ledger.deudas.find((item) => item.id === deudaId)
    const restored = (deuda?.amount ?? 0) + previousApplied
    const applied = Math.min(amount, restored)
    return { ledger: { ...ledger, deudas }, applied }
  }, [])

  const addPago = useCallback(
    ({ name, amount, deudaId }) => {
      updateLedger((ledger) => {
        const deuda = deudaId ? ledger.deudas.find((row) => row.id === deudaId) : null
        const item = {
          id: createId(),
          name,
          amount,
          deudaId: deudaId || null,
          paid: false,
          paidAt: null,
          appliedAmount: 0,
          kind: deuda?.kind || 'otros',
          color: deuda?.kind === 'tarjeta' ? deuda.color || null : null,
          periodKey: openPeriod(ledger),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        return { ...ledger, pagos: [item, ...ledger.pagos] }
      })
    },
    [updateLedger],
  )

  const setPagoPaid = useCallback(
    (id, paid) => {
      updateLedger((ledger) => {
        const current = ledger.pagos.find((row) => row.id === id)
        if (!current) return ledger
        const wasPaid = isPagoPaid(current)
        if (wasPaid === paid) return ledger

        let next = ledger
        let appliedAmount = current.appliedAmount || 0

        if (paid) {
          const applied = applyPaymentToDebt(next, current.deudaId, current.amount)
          next = applied.ledger
          appliedAmount = applied.applied
        } else if (current.deudaId) {
          next = applyPaymentToDebt(next, current.deudaId, 0, appliedAmount).ledger
          appliedAmount = 0
        } else {
          appliedAmount = 0
        }

        next = {
          ...next,
          pagos: next.pagos.map((row) =>
            row.id === id
              ? {
                  ...row,
                  paid,
                  paidAt: paid ? nowIso() : null,
                  appliedAmount,
                  updatedAt: nowIso(),
                }
              : row,
          ),
        }
        return next
      })
    },
    [applyPaymentToDebt, updateLedger],
  )

  const updatePago = useCallback(
    (id, patch) => {
      updateLedger((ledger) => {
        const current = ledger.pagos.find((row) => row.id === id)
        if (!current) return ledger
        const paid = isPagoPaid(current)
        let next = ledger
        if (paid && current.deudaId) {
          next = applyPaymentToDebt(next, current.deudaId, 0, current.appliedAmount || 0).ledger
        }
        const nextDeudaId = patch.deudaId === undefined ? current.deudaId : patch.deudaId
        const nextAmount = patch.amount ?? current.amount
        const nextDeuda = nextDeudaId ? next.deudas.find((row) => row.id === nextDeudaId) : null
        let appliedAmount = 0
        if (paid) {
          const applied = applyPaymentToDebt(next, nextDeudaId, nextAmount)
          next = applied.ledger
          appliedAmount = applied.applied
        }
        return {
          ...next,
          pagos: next.pagos.map((row) =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                  amount: nextAmount,
                  deudaId: nextDeudaId || null,
                  kind: nextDeuda?.kind || 'otros',
                  color: nextDeuda?.kind === 'tarjeta' ? nextDeuda.color || null : null,
                  paid,
                  appliedAmount,
                  updatedAt: nowIso(),
                }
              : row,
          ),
        }
      })
    },
    [applyPaymentToDebt, updateLedger],
  )

  const removePago = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const current = ledger.pagos.find((row) => row.id === id)
        if (!current) return ledger
        let next = ledger
        if (isPagoPaid(current) && current.deudaId) {
          next = applyPaymentToDebt(next, current.deudaId, 0, current.appliedAmount || 0).ledger
        }
        const after = {
          ...next,
          pagos: next.pagos.filter((row) => row.id !== id),
        }
        return after
      })
    },
    [applyPaymentToDebt, updateLedger],
  )

  const addIngreso = useCallback(
    ({ name, amount }) => {
      updateLedger((ledger) => {
        const item = {
          id: createId(),
          name,
          amount,
          periodKey: openPeriod(ledger),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        const next = { ...ledger, ingresos: [item, ...ledger.ingresos] }
        return next
      })
    },
    [updateLedger],
  )

  const updateIngreso = useCallback(
    (id, patch) => {
      updateLedger((ledger) => {
        const next = {
          ...ledger,
          ingresos: ledger.ingresos.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
          ),
        }
        return next
      })
    },
    [updateLedger],
  )

  const removeIngreso = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const next = {
          ...ledger,
          ingresos: ledger.ingresos.filter((row) => row.id !== id),
        }
        return next
      })
    },
    [updateLedger],
  )

  const addAhorro = useCallback(
    ({ name, amount, goalAmount, monthlyTarget, image, link, shared = false, members = [] }) => {
      const createdAt = nowIso()
      const byUsername = account?.username || ''
      let item = {
        id: createId(),
        name,
        amount,
        goalAmount: goalAmount || 0,
        monthlyTarget: monthlyTarget || 0,
        image: image || '',
        link: link || '',
        shared: false,
        history: amount > 0 ? [makeAhorroDeposit(amount, 'Monto inicial', createdAt, byUsername)] : [],
        createdAt,
        updatedAt: createdAt,
      }
      if (shared && account) {
        item = withAddedMembers(makeSharedAhorro(item, account), members)
      }
      updateLedger((ledger) => ({ ...ledger, ahorros: [item, ...ledger.ahorros] }))
      return item
    },
    [account, updateLedger],
  )

  const updateAhorro = useCallback(
    (id, patch) => {
      const byUsername = account?.username || ''
      updateLedger((ledger) => ({
        ...ledger,
        ahorros: ledger.ahorros.map((item) => {
          if (item.id !== id) return item
          const next = { ...item, ...patch, updatedAt: nowIso() }
          if (patch.amount == null) return next
          const delta = Number((Number(next.amount) - Number(item.amount || 0)).toFixed(2))
          if (!delta) return next
          next.history = [
            ...(item.history || []),
            makeAhorroDeposit(delta, 'Ajuste de monto', nowIso(), byUsername),
          ]
          return next
        }),
      }))
    },
    [account, updateLedger],
  )

  const addAhorroDeposit = useCallback(
    (ahorroId, { amount, source }) => {
      updateLedger((ledger) => {
        const deposit = makeAhorroDeposit(amount, source, nowIso(), account?.username || '')
        return {
          ...ledger,
          ahorros: ledger.ahorros.map((item) =>
            item.id === ahorroId
              ? {
                  ...item,
                  amount: Number((item.amount + deposit.amount).toFixed(2)),
                  history: [...(item.history || []), deposit],
                  updatedAt: nowIso(),
                }
              : item,
          ),
        }
      })
    },
    [account, updateLedger],
  )

  const removeAhorroDeposit = useCallback(
    (ahorroId, depositId) => {
      updateLedger((ledger) => ({
        ...ledger,
        ahorros: ledger.ahorros.map((item) => {
          if (item.id !== ahorroId) return item
          const history = item.history || []
          const entry = history.find((row) => row.id === depositId)
          if (!entry) return item
          return {
            ...item,
            amount: Number(Math.max(0, item.amount - (Number(entry.amount) || 0)).toFixed(2)),
            history: history.filter((row) => row.id !== depositId),
            updatedAt: nowIso(),
          }
        }),
      }))
    },
    [updateLedger],
  )

  const removeAhorro = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const item = ledger.ahorros.find((row) => row.id === id)
        if (item?.shared && account && !isAhorroOwner(item, account)) return ledger
        return {
          ...ledger,
          ahorros: ledger.ahorros.filter((row) => row.id !== id),
        }
      })
    },
    [account, updateLedger],
  )

  const shareAhorro = useCallback(
    (id, users = []) => {
      if (!account) return
      updateLedger((ledger) => ({
        ...ledger,
        ahorros: ledger.ahorros.map((item) => {
          if (item.id !== id) return item
          const shared = item.shared ? item : makeSharedAhorro(item, account)
          return { ...withAddedMembers(shared, users), updatedAt: nowIso() }
        }),
      }))
    },
    [account, updateLedger],
  )

  const addAhorroMembers = useCallback(
    (id, users) => {
      updateLedger((ledger) => ({
        ...ledger,
        ahorros: ledger.ahorros.map((item) => {
          if (item.id !== id || !item.shared) return item
          return { ...withAddedMembers(item, users), updatedAt: nowIso() }
        }),
      }))
    },
    [updateLedger],
  )

  const removeAhorroMember = useCallback(
    (id, memberId) => {
      updateLedger((ledger) => ({
        ...ledger,
        ahorros: ledger.ahorros.map((item) => {
          if (item.id !== id || !item.shared) return item
          if (item.ownerId === memberId) return item
          return {
            ...item,
            members: (item.members || []).filter((member) => member.id !== memberId),
            updatedAt: nowIso(),
          }
        }),
      }))
    },
    [updateLedger],
  )

  const addPrestamo = useCallback(
    ({ name, amount, interest, image, dueDate, notes, linked = false, borrower = null }) => {
      const createdAt = nowIso()
      let item = {
        id: createId(),
        name,
        amount,
        interest: interest || 0,
        image: image || '',
        dueDate: dueDate || '',
        notes: notes || '',
        remainingAmount: Number((amount + ((amount * (interest || 0)) / 100)).toFixed(2)),
        claims: [],
        paymentHistory: [],
        createdAt,
        updatedAt: createdAt,
      }
      if (linked && account && borrower) {
        item = makeLinkedLoan(item, account, borrower)
      }
      updateLedger((ledger) => ({
        ...ledger,
        prestamos: [item, ...(ledger.prestamos || [])],
      }))
    },
    [account, updateLedger],
  )

  const updatePrestamo = useCallback(
    (id, patch) => {
      updateLedger((ledger) => ({
        ...ledger,
        prestamos: (ledger.prestamos || []).map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
        ),
      }))
    },
    [updateLedger],
  )

  const removePrestamo = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const current = (ledger.prestamos || []).find((row) => row.id === id)
        if (!current) return ledger
        return {
          ...ledger,
          prestamoDisponible: poolAfterRemovingLoan(ledger.prestamoDisponible, current),
          prestamos: (ledger.prestamos || []).filter((row) => row.id !== id),
        }
      })
    },
    [updateLedger],
  )

  const collectPrestamo = useCallback(
    (id, collector) => {
      const name = String(collector || '').trim()
      if (!name) return { ok: false, error: 'Escribe el nombre de quien cobró.' }
      updateLedger((ledger) => {
        const current = (ledger.prestamos || []).find((item) => item.id === id)
        if (!current || current.collected) return ledger
        const collectedAmount = loanTotal(current)
        const interest = loanInterestAmount(current)
        const pool = Number(ledger.prestamoDisponible) || 0
        const poolDelta = pool > 0 ? interest : collectedAmount
        const nextPool = Number((pool + poolDelta).toFixed(2))
        return {
          ...ledger,
          prestamoDisponible: nextPool,
          prestamos: (ledger.prestamos || []).map((item) =>
            item.id === id
              ? {
                  ...item,
                  collected: true,
                  collector: name,
                  collectedAt: nowIso(),
                  collectedAmount,
                  remainingAmount: 0,
                  poolDelta,
                  claims: (item.claims || []).map((claim) =>
                    claim.status === 'pending'
                      ? { ...claim, status: 'confirmed', reviewedAt: nowIso() }
                      : claim,
                  ),
                  updatedAt: nowIso(),
                }
              : item,
          ),
        }
      })
      return { ok: true }
    },
    [updateLedger],
  )

  const claimLoanPayment = useCallback(
    (id, { amount, note }) => {
      const pay = Number(amount) || 0
      if (pay <= 0) return { ok: false, error: 'Indica un monto mayor a 0.' }
      let result = { ok: true }
      updateLedger((ledger) => {
        const current = (ledger.prestamosRecibidos || []).find((item) => item.id === id)
        if (!current || current.collected) {
          result = { ok: false, error: 'No encontramos esa deuda.' }
          return ledger
        }
        if (pendingLoanClaim(current)) {
          result = { ok: false, error: 'Ya hay un pago en espera de confirmación.' }
          return ledger
        }
        const owed = loanOwed(current)
        if (pay - owed > 0.009) {
          result = { ok: false, error: `El máximo a registrar es ${owed.toFixed(2)}.` }
          return ledger
        }
        const claim = {
          id: createId(),
          amount: Number(pay.toFixed(2)),
          note: String(note || '').trim(),
          status: 'pending',
          createdAt: nowIso(),
          createdBy: account?.username || '',
        }
        return {
          ...ledger,
          prestamosRecibidos: ledger.prestamosRecibidos.map((item) =>
            item.id === id
              ? { ...item, claims: [...(item.claims || []), claim], updatedAt: nowIso() }
              : item,
          ),
        }
      })
      return result
    },
    [account, updateLedger],
  )

  const reviewLoanClaim = useCallback(
    (id, claimId, accepted) => {
      updateLedger((ledger) => {
        const current = (ledger.prestamos || []).find((item) => item.id === id)
        if (!current || !isLinkedLoan(current)) return ledger
        const claim = (current.claims || []).find((row) => row.id === claimId)
        if (!claim || claim.status !== 'pending') return ledger
        const reviewedAt = nowIso()
        const claims = current.claims.map((row) =>
          row.id === claimId
            ? { ...row, status: accepted ? 'confirmed' : 'rejected', reviewedAt }
            : row,
        )
        if (!accepted) {
          return {
            ...ledger,
            prestamos: ledger.prestamos.map((item) =>
              item.id === id ? { ...item, claims, updatedAt: reviewedAt } : item,
            ),
          }
        }
        const paid = Number(claim.amount) || 0
        const nextRemaining = Number(Math.max(0, loanOwed(current) - paid).toFixed(2))
        const history = [
          ...(current.paymentHistory || []),
          {
            id: claim.id,
            amount: paid,
            date: reviewedAt,
            note: claim.note || '',
            confirmedBy: account?.username || '',
          },
        ]
        const closed = nextRemaining <= 0.009
        let nextPool = Number(ledger.prestamoDisponible) || 0
        let poolDelta = current.poolDelta
        if (closed && !current.collected) {
          const collectedAmount = loanTotal(current)
          const interest = loanInterestAmount(current)
          poolDelta = nextPool > 0 ? interest : collectedAmount
          nextPool = Number((nextPool + poolDelta).toFixed(2))
        }
        return {
          ...ledger,
          prestamoDisponible: nextPool,
          prestamos: ledger.prestamos.map((item) =>
            item.id === id
              ? {
                  ...item,
                  claims,
                  paymentHistory: history,
                  remainingAmount: nextRemaining,
                  collected: closed,
                  collector: closed ? account?.username || claim.createdBy : item.collector,
                  collectedAt: closed ? reviewedAt : item.collectedAt,
                  collectedAmount: closed ? loanTotal(current) : item.collectedAmount,
                  poolDelta: closed ? poolDelta : item.poolDelta,
                  updatedAt: reviewedAt,
                }
              : item,
          ),
        }
      })
      return { ok: true }
    },
    [account, updateLedger],
  )

  const setPrestamoDisponible = useCallback(
    (amount) => {
      updateLedger((ledger) => ({
        ...ledger,
        prestamoDisponible: Number(amount) || 0,
      }))
    },
    [updateLedger],
  )

  const allocateSurplus = useCallback(
    (ahorroId, extraName) => {
      if (!surplusPrompt) return
      const amount = surplusPrompt.remainder
      const shouldClose = pendingCloseRef.current
      pendingCloseRef.current = false
      updateLedger((ledger) => {
        const withSurplus = applySurplus(ledger, amount, ahorroId, extraName, account?.username || '')
        return shouldClose ? applyMonthClose(withSurplus) : withSurplus
      })
      setSurplusPrompt(null)
    },
    [account, surplusPrompt, updateLedger],
  )

  const dismissSurplus = useCallback(() => {
    const shouldClose = pendingCloseRef.current
    pendingCloseRef.current = false
    setSurplusPrompt(null)
    if (shouldClose) {
      updateLedger((ledger) => applyMonthClose(ledger))
    }
  }, [updateLedger])

  const isAdmin = isAdminUsername(account?.username)

  const listUsers = useCallback(async () => {
    if (usingApiRef.current) {
      const payload = await fetchAdminAccounts()
      return payload.accounts || []
    }
    return store.accounts.map((item) => ({
      id: item.id,
      username: item.username,
      createdAt: item.createdAt,
      isAdmin: isAdminUsername(item.username),
    }))
  }, [store.accounts])

  const listDirectory = useCallback(async () => {
    if (usingApiRef.current) {
      const payload = await fetchDirectory()
      return payload.accounts || []
    }
    return store.accounts.map((item) => ({
      id: item.id,
      username: item.username,
    }))
  }, [store.accounts])

  const refreshAccount = useCallback(async () => {
    if (!usingApiRef.current) return
    const gen = mutationGen.current
    try {
      await saveQueue.current
      if (gen !== mutationGen.current) return
      const payload = await fetchMe()
      if (gen !== mutationGen.current) return
      const next = withHydrated(payload.account)
      setStore({ accounts: [next] })
      setSessionId(next.id)
      saveSessionId(next.id)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const deleteUser = useCallback(
    async (id) => {
      if (usingApiRef.current) {
        try {
          await deleteAdminAccount(id)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const target = store.accounts.find((item) => item.id === id)
      if (!target) return { ok: false, error: 'Usuario no encontrado.' }
      if (isAdminUsername(target.username) || target.id === sessionId) {
        return { ok: false, error: 'No puedes eliminar al administrador.' }
      }
      persist({ accounts: store.accounts.filter((item) => item.id !== id) }, sessionId)
      return { ok: true }
    },
    [persist, sessionId, store.accounts],
  )

  const hiddenSections = useMemo(
    () => normalizeHiddenSections(account?.data?.hiddenSections),
    [account],
  )

  const isSectionVisible = useCallback(
    (id) => !hiddenSections.includes(id),
    [hiddenSections],
  )

  const setSectionHidden = useCallback(
    (id, hidden) => {
      if (!HIDEABLE_IDS.includes(id)) return
      updateLedger((ledger) => {
        const current = normalizeHiddenSections(ledger.hiddenSections)
        const next = hidden ? [...new Set([...current, id])] : current.filter((item) => item !== id)
        return { ...ledger, hiddenSections: next }
      })
    },
    [updateLedger],
  )

  const closeMonth = useCallback(() => {
    if (!account) return { ok: false, error: 'No hay una cuenta activa.' }
    const ledger = hydrateLedger(account.data)
    const guard = closeMonthGuard(ledger)
    if (!guard.ok) return guard
    const remainder = periodRemainder(ledger)
    if (remainder > 0) {
      pendingCloseRef.current = true
      setSurplusPrompt({ remainder, month: openPeriod(ledger), fromClose: true })
      return { ok: true, waitingSurplus: true }
    }
    updateLedger((current) => applyMonthClose(current))
    return { ok: true }
  }, [account, updateLedger])

  const totals = useMemo(() => {
    const data = account?.data ?? emptyLedger()
    const month = openPeriod(data)
    const ingresosMes = data.ingresos.filter((row) => inPeriod(row, month))
    const pagosMes = data.pagos.filter((row) => inPeriod(row, month))
    const pagosPagadosMes = paidPagos(pagosMes)
    const totalIngresos = sumAmounts(ingresosMes)
    const totalPagos = sumAmounts(pagosPagadosMes)
    const totalPendientes = sumAmounts(pagosMes.filter((row) => !isPagoPaid(row)))
    return {
      periodKey: month,
      creditos: sumAmounts(data.creditos),
      deudas: sumAmounts(data.deudas),
      deudasPrestamos: receivedLoanDebtTotal(data.prestamosRecibidos),
      deudasTotales: Number((sumAmounts(data.deudas) + receivedLoanDebtTotal(data.prestamosRecibidos)).toFixed(2)),
      pagos: sumAmounts(paidPagos(data.pagos)),
      pagosMes: totalPagos,
      pagosPendientesMes: totalPendientes,
      ingresos: sumAmounts(data.ingresos),
      ingresosMes: totalIngresos,
      ahorros: sumAmounts(data.ahorros),
      prestamos: sumAmounts(openLoans(data.prestamos || [])),
      prestamoDisponible: Number(data.prestamoDisponible) || 0,
      remainder: totalIngresos - totalPagos,
    }
  }, [account])

  const kabin = useMemo(() => {
    const data = account?.data ?? emptyLedger()
    return getKabinAdvice(data)
  }, [account])

  const value = {
    accounts: store.accounts,
    account,
    loggedIn: Boolean(account),
    ready,
    usingApi,
    isAdmin,
    surplusPrompt,
    totals,
    kabin,
    createAccount,
    login,
    logout,
    addCredito,
    updateCredito,
    removeCredito,
    addDeuda,
    updateDeuda,
    removeDeuda,
    addPago,
    setPagoPaid,
    updatePago,
    removePago,
    addIngreso,
    updateIngreso,
    removeIngreso,
    addAhorro,
    updateAhorro,
    addAhorroDeposit,
    removeAhorroDeposit,
    removeAhorro,
    shareAhorro,
    addAhorroMembers,
    removeAhorroMember,
    addPrestamo,
    updatePrestamo,
    removePrestamo,
    collectPrestamo,
    claimLoanPayment,
    reviewLoanClaim,
    setPrestamoDisponible,
    allocateSurplus,
    dismissSurplus,
    closeMonth,
    listUsers,
    listDirectory,
    refreshAccount,
    deleteUser,
    hiddenSections,
    isSectionVisible,
    setSectionHidden,
  }

  return <FinanzasContext.Provider value={value}>{children}</FinanzasContext.Provider>
}
