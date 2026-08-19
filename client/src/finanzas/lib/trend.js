import { currentMonthKey, monthEndMs, monthKey, monthRange, addMonths } from './dates'
import { isPagoPaid } from './pagos'
import { openPeriod } from './period'
import { sumAmounts } from './money'
import { loanTotal, isLoanCollected } from './prestamos'

function timeOf(iso) {
  const value = new Date(iso).getTime()
  return Number.isFinite(value) ? value : 0
}

function earliestKey(dates, fallback) {
  const valid = dates.filter(Boolean).map((value) => monthKeyOf(value) || monthKey(value))
  if (!valid.length) return fallback
  return valid.sort()[0]
}

function monthKeyOf(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7)
  return monthKey(value)
}

function monthRangeFor(data, extraDates, monthsCount) {
  const period = openPeriod(data)
  const endKey = period
  const minKey = addMonths(endKey, -(monthsCount - 1))
  const startKey = [earliestKey(extraDates, endKey), minKey].filter(Boolean).sort()[0]
  const rangeStart = startKey < minKey ? minKey : startKey
  return monthRange(rangeStart, endKey)
}

export function buildMonthlyTrend(data, monthsCount = 6) {
  const deudas = data?.deudas ?? []
  const ahorros = data?.ahorros ?? []
  const pagos = data?.pagos ?? []
  const closedMonths = data?.closedMonths ?? []
  const period = openPeriod(data)
  const closedByKey = Object.fromEntries(closedMonths.map((month) => [month.monthKey, month]))
  const endKey = period
  const minKey = addMonths(endKey, -(monthsCount - 1))
  const startKey = [
    earliestKey(
      [
        ...deudas.map((item) => item.createdAt),
        ...ahorros.map((item) => item.createdAt),
        ...pagos.map((item) => item.paidAt || item.createdAt),
        ...closedMonths.map((month) => month.closedAt),
      ],
      endKey,
    ),
    minKey,
    ...closedMonths.map((month) => month.monthKey),
  ]
    .filter(Boolean)
    .sort()[0]
  const rangeStart = startKey < minKey ? minKey : startKey
  const keys = monthRange(rangeStart, endKey)

  const points = keys.map((key) => {
    const closed = closedByKey[key]
    if (closed) {
      return {
        key,
        deudas: Number(closed.totals?.deudas || 0),
        ahorros: Number(closed.totals?.ahorros || 0),
      }
    }
    if (key === period) {
      return {
        key,
        deudas: sumAmounts(deudas),
        ahorros: sumAmounts(ahorros),
      }
    }
    const endMs = monthEndMs(key)
    const deudasTotal = deudas.reduce((total, deuda) => {
      if (timeOf(deuda.createdAt) > endMs) return total
      const original = Number(deuda.originalAmount ?? deuda.amount) || 0
      const paid = pagos
        .filter((pago) => pago.deudaId === deuda.id && isPagoPaid(pago))
        .filter((pago) => timeOf(pago.paidAt || pago.updatedAt || pago.createdAt) <= endMs)
        .reduce((sum, pago) => sum + (Number(pago.appliedAmount) || Number(pago.amount) || 0), 0)
      return total + Math.max(0, original - paid)
    }, 0)
    const ahorrosTotal = ahorros
      .filter((item) => timeOf(item.createdAt) <= endMs)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    return {
      key,
      deudas: Number(deudasTotal.toFixed(2)),
      ahorros: Number(ahorrosTotal.toFixed(2)),
    }
  })

  const hasData = points.some((point) => point.deudas > 0 || point.ahorros > 0)
  return { points, hasData }
}

export function buildGoalTrend(goal, monthsCount = 6) {
  const endKey = currentMonthKey()
  const createdKey = monthKey(goal.createdAt)
  const minKey = addMonths(endKey, -(monthsCount - 1))
  const startKey = createdKey < minKey ? minKey : createdKey
  const keys = monthRange(startKey, endKey)
  const amount = Number(goal.amount) || 0
  const goalAmount = Number(goal.goalAmount) || 0
  const monthlyTarget = Number(goal.monthlyTarget) || 0

  const points = keys.map((key) => {
    const started = key >= createdKey
    const monthsOpen = monthSpan(createdKey, key) + 1
    const planned = monthlyTarget > 0 ? monthlyTarget * Math.max(monthsOpen, 0) : 0
    const target = goalAmount > 0 ? goalAmount : planned
    return {
      key,
      actual: started ? amount : 0,
      goal: started ? target : 0,
    }
  })

  const hasData = points.some((point) => point.actual > 0 || point.goal > 0)
  return { points, hasData }
}

export function buildGoalDailyTrend(goal, maxDays = 60) {
  const history = goal.history || []
  const created = new Date(goal.createdAt)
  created.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const keys = []
  const current = new Date(created)
  while (current <= today && keys.length < maxDays) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
    keys.push(key)
    current.setDate(current.getDate() + 1)
  }

  const goalAmount = Number(goal.goalAmount) || 0

  const points = keys.map((key) => {
    const dayEnd = new Date(key + 'T23:59:59.999Z')
    const actual = history
      .filter((entry) => new Date(entry.date).getTime() <= dayEnd.getTime())
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
    return {
      key,
      actual: Number(actual.toFixed(2)),
      goal: goalAmount > 0 ? goalAmount : 0,
    }
  })

  const hasData = points.some((point) => point.actual > 0 || point.goal > 0)
  return { points, hasData }
}

export function buildPrestamosTrend(data, monthsCount = 6) {
  const prestamos = data?.prestamos ?? []
  const fondo = Number(data?.prestamoDisponible) || 0
  const keys = monthRangeFor(
    data,
    [
      ...prestamos.map((item) => item.createdAt),
      ...prestamos.map((item) => item.dueDate),
      ...prestamos.map((item) => item.collectedAt),
    ],
    monthsCount,
  )

  const points = keys.map((key) => {
    const endMs = monthEndMs(key)
    const existing = prestamos.filter((loan) => timeOf(loan.createdAt) <= endMs)
    const open = existing.filter((loan) => {
      if (!isLoanCollected(loan) || !loan.collectedAt) return true
      return timeOf(loan.collectedAt) > endMs
    })
    const prestado = open.reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
    const porCobrar = open.reduce((sum, loan) => sum + loanTotal(loan), 0)
    const leftover = Math.max(0, fondo - prestado)
    const siCobra = Number((leftover + porCobrar).toFixed(2))
    return {
      key,
      fondo: Number(fondo.toFixed(2)),
      prestado: Number(prestado.toFixed(2)),
      siCobra,
    }
  })

  const hasData = fondo > 0 || points.some((point) => point.prestado > 0 || point.siCobra > 0)
  return { points, hasData }
}

function monthSpan(fromKey, toKey) {
  const [fromYear, fromMonth] = fromKey.split('-').map(Number)
  const [toYear, toMonth] = toKey.split('-').map(Number)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth)
}
