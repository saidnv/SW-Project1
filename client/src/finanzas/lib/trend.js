import { currentMonthKey, monthEndMs, monthKey, monthRange, addMonths, parseLocalDate, formatMonthShort, todayInputValue } from './dates'
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

function goalProgressEvents(goal) {
  const events = []
  const history = Array.isArray(goal.history) ? goal.history : []
  const historySum = history.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  const amount = Number(goal.amount) || 0
  const base = Number((amount - historySum).toFixed(2))
  if (Math.abs(base) > 0.009) {
    events.push({
      id: 'base',
      amount: base,
      source: history.length ? 'Saldo previo' : 'Monto inicial',
      date: goal.createdAt || history[0]?.date || nowIsoFallback(),
      byUsername: '',
    })
  }
  for (const entry of history) {
    events.push({
      id: entry.id || `${entry.date}-${entry.amount}`,
      amount: Number(entry.amount) || 0,
      source: String(entry.source || '').trim(),
      date: entry.date,
      byUsername: String(entry.byUsername || '').trim(),
    })
  }
  return events.sort((a, b) => timeOf(a.date) - timeOf(b.date))
}

function nowIsoFallback() {
  return new Date().toISOString()
}

function localDayKey(iso) {
  const date = parseLocalDate(iso)
  if (!date) return todayInputValue()
  return todayInputValue(date)
}

function goalTargetFor(goal, createdKey, key) {
  const goalAmount = Number(goal.goalAmount) || 0
  if (goalAmount > 0) return goalAmount
  const monthlyTarget = Number(goal.monthlyTarget) || 0
  if (monthlyTarget <= 0) return 0
  const monthsOpen = monthSpan(createdKey, key) + 1
  return monthlyTarget * Math.max(monthsOpen, 0)
}

function goalPointLabel(month, date, isContribution) {
  const monthLabel = formatMonthShort(month)
  if (!isContribution) return monthLabel
  const parsed = parseLocalDate(date)
  if (!parsed) return monthLabel
  return `${monthLabel} · ${parsed.getDate()}`
}

function makeGoalPoint({ id, key, actual, goal, increment = 0, source = '', date, isContribution = false }) {
  const remaining = goal > 0 ? Number(Math.max(0, goal - actual).toFixed(2)) : null
  const axisKey = date ? localDayKey(date) : key
  return {
    id,
    key: axisKey,
    label: goalPointLabel(key, date, isContribution || Boolean(date)),
    actual: Number(actual.toFixed(2)),
    goal: Number(goal.toFixed(2)),
    increment: Number((increment || 0).toFixed(2)),
    source,
    remaining,
    reached: goal > 0 && actual >= goal,
  }
}

export function buildGoalTrend(goal) {
  const amount = Number(goal?.amount) || 0
  const goalAmount = Number(goal?.goalAmount) || 0
  const events = goalProgressEvents(goal)
  const created = goal?.createdAt || events[0]?.date || nowIsoFallback()
  const target = goalAmount || goalTargetFor(goal, monthKey(created), currentMonthKey())
  const points = []

  points.push(
    makeGoalPoint({
      id: `${goal?.id || 'goal'}-start`,
      key: monthKey(created),
      actual: 0,
      goal: target,
      date: created,
    }),
  )

  let running = 0
  events.forEach((entry, index) => {
    running = Number((running + (Number(entry.amount) || 0)).toFixed(2))
    const who = [entry.byUsername, entry.source].filter(Boolean).join(' · ')
    points.push(
      makeGoalPoint({
        id: entry.id || `${goal?.id || 'goal'}-${index}`,
        key: monthKey(entry.date || created),
        actual: Math.max(0, running),
        goal: target,
        increment: entry.amount,
        source: who,
        date: entry.date || created,
        isContribution: true,
      }),
    )
  })

  if (Math.abs(running - amount) > 0.009) {
    points.push(
      makeGoalPoint({
        id: `${goal?.id || 'goal'}-now`,
        key: currentMonthKey(),
        actual: Math.max(0, amount),
        goal: target,
        increment: amount - running,
        source: 'Saldo actual',
        date: nowIsoFallback(),
        isContribution: true,
      }),
    )
  }

  const trimmed = points.length > 14 ? [points[0], ...points.slice(-13)] : points
  const hasData = trimmed.some((point) => point.actual > 0 || point.goal > 0)
  return { points: trimmed, hasData }
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
