import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { currentMonthKey, inMonth, nowIso } from '../lib/dates'
import { createId } from '../lib/ids'
import { getKabinAdvice } from '../lib/kabin'
import { sumAmounts } from '../lib/money'
import { isPagoPaid, paidPagos } from '../lib/pagos'
import {
  clearApiToken,
  fetchMe,
  isLedgerEmpty,
  loginAccount,
  logoutAccount,
  pingApi,
  registerAccount,
  saveLedger,
} from '../lib/api'
import {
  emptyLedger,
  loadSessionId,
  loadStore,
  MAX_ACCOUNTS,
  saveSessionId,
  saveStore,
} from '../lib/storage'
import { FinanzasContext } from './FinanzasContext'

function pushHistory(ledger, entry) {
  const next = [{ id: createId(), at: nowIso(), ...entry }, ...ledger.history]
  return { ...ledger, history: next.slice(0, 120) }
}

function cloneLedger(ledger) {
  return structuredClone(ledger)
}

function localAccountByUsername(username) {
  return loadStore().accounts.find(
    (item) => item.username.toLowerCase() === String(username || '').toLowerCase(),
  )
}

export default function FinanzasProvider({ children }) {
  const [store, setStore] = useState(loadStore)
  const [sessionId, setSessionId] = useState(loadSessionId)
  const [surplusPrompt, setSurplusPrompt] = useState(null)
  const [ready, setReady] = useState(false)
  const [usingApi, setUsingApi] = useState(false)
  const usingApiRef = useRef(false)
  const saveQueue = useRef(Promise.resolve())

  const persist = useCallback((nextStore, nextSessionId = sessionId) => {
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

  const account = store.accounts.find((item) => item.id === sessionId) ?? null

  const updateLedger = useCallback(
    (updater, historyEntry) => {
      if (!account) return
      const current = cloneLedger(account.data)
      let next = updater(current)
      if (historyEntry) next = pushHistory(next, historyEntry)
      const nextStore = {
        ...store,
        accounts: store.accounts.map((item) =>
          item.id === account.id ? { ...item, data: next } : item,
        ),
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

      if (usingApiRef.current) {
        try {
          const local = localAccountByUsername(name)
          const payload = await registerAccount(name, pin, local?.data)
          persist({ accounts: [payload.account] }, payload.account.id)
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
            const saved = await saveLedger(local.data)
            account = saved.account
          }
          persist({ accounts: [account] }, account.id)
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
          setStore({ accounts: [payload.account] })
          setSessionId(payload.account.id)
          saveSessionId(payload.account.id)
        } catch {
          clearApiToken()
          setStore({ accounts: [] })
          setSessionId(null)
          saveSessionId(null)
        }
      }
      setReady(true)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const addCredito = useCallback(
    ({ name, amount }) => {
      const item = { id: createId(), name, amount, createdAt: nowIso(), updatedAt: nowIso() }
      updateLedger(
        (ledger) => ({ ...ledger, creditos: [item, ...ledger.creditos] }),
        { module: 'creditos', action: 'create', label: name, detail: `Línea de crédito ${name}` },
      )
    },
    [updateLedger],
  )

  const updateCredito = useCallback(
    (id, patch) => {
      updateLedger(
        (ledger) => ({
          ...ledger,
          creditos: ledger.creditos.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
          ),
        }),
        { module: 'creditos', action: 'update', label: patch.name ?? id, detail: 'Crédito editado' },
      )
    },
    [updateLedger],
  )

  const removeCredito = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const item = ledger.creditos.find((row) => row.id === id)
        return {
          ...ledger,
          creditos: ledger.creditos.filter((row) => row.id !== id),
          history: pushHistory(ledger, {
            module: 'creditos',
            action: 'delete',
            label: item?.name ?? id,
            detail: 'Crédito eliminado',
          }).history,
        }
      })
    },
    [updateLedger],
  )

  const addDeuda = useCallback(
    ({ name, amount }) => {
      const item = {
        id: createId(),
        name,
        originalAmount: amount,
        amount,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      updateLedger(
        (ledger) => ({ ...ledger, deudas: [item, ...ledger.deudas] }),
        { module: 'deudas', action: 'create', label: name, detail: `Deuda registrada` },
      )
    },
    [updateLedger],
  )

  const updateDeuda = useCallback(
    (id, patch) => {
      updateLedger(
        (ledger) => ({
          ...ledger,
          deudas: ledger.deudas.map((item) => {
            if (item.id !== id) return item
            const nextAmount = patch.amount ?? item.amount
            return {
              ...item,
              ...patch,
              amount: nextAmount,
              originalAmount: Math.max(item.originalAmount, nextAmount),
              updatedAt: nowIso(),
            }
          }),
        }),
        { module: 'deudas', action: 'update', label: patch.name ?? id, detail: 'Deuda editada' },
      )
    },
    [updateLedger],
  )

  const removeDeuda = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const item = ledger.deudas.find((row) => row.id === id)
        return {
          ...ledger,
          deudas: ledger.deudas.filter((row) => row.id !== id),
          pagos: ledger.pagos.map((pago) =>
            pago.deudaId === id ? { ...pago, deudaId: null } : pago,
          ),
          history: pushHistory(ledger, {
            module: 'deudas',
            action: 'delete',
            label: item?.name ?? id,
            detail: 'Deuda eliminada',
          }).history,
        }
      })
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

  const maybePromptSurplus = useCallback((ledger) => {
    const month = currentMonthKey()
    const totalIngresos = sumAmounts(ledger.ingresos.filter((row) => inMonth(row.createdAt, month)))
    const totalPagos = sumAmounts(
      paidPagos(ledger.pagos.filter((row) => inMonth(row.createdAt, month))),
    )
    const remainder = Number((totalIngresos - totalPagos).toFixed(2))
    if (remainder > 0 && totalIngresos > 0 && totalPagos > 0) {
      setSurplusPrompt({ remainder, month })
    } else {
      setSurplusPrompt(null)
    }
  }, [])

  const addPago = useCallback(
    ({ name, amount, deudaId }) => {
      updateLedger((ledger) => {
        const item = {
          id: createId(),
          name,
          amount,
          deudaId: deudaId || null,
          paid: false,
          paidAt: null,
          appliedAmount: 0,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        return pushHistory(
          { ...ledger, pagos: [item, ...ledger.pagos] },
          {
            module: 'pagos',
            action: 'create',
            label: name,
            detail: 'Pago mensual pendiente',
          },
        )
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
        maybePromptSurplus(next)
        return pushHistory(next, {
          module: 'pagos',
          action: 'update',
          label: current.name,
          detail: paid ? 'Marcado como pagado' : 'Marcado como pendiente',
        })
      })
    },
    [applyPaymentToDebt, maybePromptSurplus, updateLedger],
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
                  paid,
                  appliedAmount,
                  updatedAt: nowIso(),
                }
              : row,
          ),
        }
      }, { module: 'pagos', action: 'update', label: patch.name ?? id, detail: 'Pago editado' })
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
        maybePromptSurplus(after)
        return {
          ...after,
          history: pushHistory(after, {
            module: 'pagos',
            action: 'delete',
            label: current.name,
            detail: 'Pago eliminado',
          }).history,
        }
      })
    },
    [applyPaymentToDebt, maybePromptSurplus, updateLedger],
  )

  const addIngreso = useCallback(
    ({ name, amount }) => {
      updateLedger((ledger) => {
        const item = { id: createId(), name, amount, createdAt: nowIso(), updatedAt: nowIso() }
        const next = pushHistory(
          { ...ledger, ingresos: [item, ...ledger.ingresos] },
          { module: 'ingresos', action: 'create', label: name, detail: 'Ingreso registrado' },
        )
        maybePromptSurplus(next)
        return next
      })
    },
    [maybePromptSurplus, updateLedger],
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
        maybePromptSurplus(next)
        return next
      }, { module: 'ingresos', action: 'update', label: patch.name ?? id, detail: 'Ingreso editado' })
    },
    [maybePromptSurplus, updateLedger],
  )

  const removeIngreso = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const item = ledger.ingresos.find((row) => row.id === id)
        const next = {
          ...ledger,
          ingresos: ledger.ingresos.filter((row) => row.id !== id),
        }
        maybePromptSurplus(next)
        return {
          ...next,
          history: pushHistory(next, {
            module: 'ingresos',
            action: 'delete',
            label: item?.name ?? id,
            detail: 'Ingreso eliminado',
          }).history,
        }
      })
    },
    [maybePromptSurplus, updateLedger],
  )

  const addAhorro = useCallback(
    ({ name, amount, goalAmount, monthlyTarget, image, link }) => {
      const item = {
        id: createId(),
        name,
        amount,
        goalAmount: goalAmount || 0,
        monthlyTarget: monthlyTarget || 0,
        image: image || '',
        link: link || '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      updateLedger(
        (ledger) => ({ ...ledger, ahorros: [item, ...ledger.ahorros] }),
        { module: 'ahorros', action: 'create', label: name, detail: 'Meta de ahorro' },
      )
    },
    [updateLedger],
  )

  const updateAhorro = useCallback(
    (id, patch) => {
      updateLedger(
        (ledger) => ({
          ...ledger,
          ahorros: ledger.ahorros.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
          ),
        }),
        { module: 'ahorros', action: 'update', label: patch.name ?? id, detail: 'Ahorro editado' },
      )
    },
    [updateLedger],
  )

  const removeAhorro = useCallback(
    (id) => {
      updateLedger((ledger) => {
        const item = ledger.ahorros.find((row) => row.id === id)
        return {
          ...ledger,
          ahorros: ledger.ahorros.filter((row) => row.id !== id),
          history: pushHistory(ledger, {
            module: 'ahorros',
            action: 'delete',
            label: item?.name ?? id,
            detail: 'Ahorro eliminado',
          }).history,
        }
      })
    },
    [updateLedger],
  )

  const allocateSurplus = useCallback(
    (ahorroId, extraName) => {
      if (!surplusPrompt) return
      const amount = surplusPrompt.remainder
      updateLedger((ledger) => {
        if (ahorroId) {
          return {
            ...ledger,
            ahorros: ledger.ahorros.map((item) =>
              item.id === ahorroId
                ? { ...item, amount: Number((item.amount + amount).toFixed(2)), updatedAt: nowIso() }
                : item,
            ),
          }
        }
        const item = {
          id: createId(),
          name: extraName || 'Ahorro del mes',
          amount,
          goalAmount: 0,
          monthlyTarget: 0,
          image: '',
          link: '',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        return { ...ledger, ahorros: [item, ...ledger.ahorros] }
      }, { module: 'ahorros', action: 'create', label: extraName || 'Remanente', detail: 'Remanente ahorrado' })
      setSurplusPrompt(null)
    },
    [surplusPrompt, updateLedger],
  )

  const dismissSurplus = useCallback(() => setSurplusPrompt(null), [])

  const totals = useMemo(() => {
    const data = account?.data ?? emptyLedger()
    const month = currentMonthKey()
    const ingresosMes = data.ingresos.filter((row) => inMonth(row.createdAt, month))
    const pagosMes = data.pagos.filter((row) => inMonth(row.createdAt, month))
    const pagosPagadosMes = paidPagos(pagosMes)
    const totalIngresos = sumAmounts(ingresosMes)
    const totalPagos = sumAmounts(pagosPagadosMes)
    const totalPendientes = sumAmounts(pagosMes.filter((row) => !isPagoPaid(row)))
    return {
      creditos: sumAmounts(data.creditos),
      deudas: sumAmounts(data.deudas),
      pagos: sumAmounts(paidPagos(data.pagos)),
      pagosMes: totalPagos,
      pagosPendientesMes: totalPendientes,
      ingresos: sumAmounts(data.ingresos),
      ingresosMes: totalIngresos,
      ahorros: sumAmounts(data.ahorros),
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
    removeAhorro,
    allocateSurplus,
    dismissSurplus,
  }

  return <FinanzasContext.Provider value={value}>{children}</FinanzasContext.Provider>
}
