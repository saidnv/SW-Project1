export function nowIso() {
  return new Date().toISOString()
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function parseLocalDate(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysUntil(dateValue, from = new Date()) {
  const target = parseLocalDate(dateValue)
  if (!target) return null
  const ms = startOfDay(target).getTime() - startOfDay(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatDay(value) {
  const date = parseLocalDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function todayInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthKey(iso = nowIso()) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey() {
  return monthKey()
}

export function formatMonthKey(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })
}

export function inMonth(iso, key) {
  return monthKey(iso) === key
}

export function addMonths(key, delta) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthEndMs(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month, 0, 23, 59, 59, 999).getTime()
}

export function daysInMonth(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export const MONTH_CLOSE_LAST_DAYS = 3

export function isMonthCloseWindow(periodKey, date = new Date()) {
  if (!periodKey) return false
  const todayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  if (todayKey > periodKey) return true
  if (todayKey < periodKey) return false
  return date.getDate() > daysInMonth(periodKey) - MONTH_CLOSE_LAST_DAYS
}

export function formatMonthShort(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
}

export function formatDayShort(value) {
  const date = parseLocalDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  }).replace('.', '')
}

export function monthRange(fromKey, toKey) {
  const keys = []
  let current = fromKey
  while (current <= toKey) {
    keys.push(current)
    current = addMonths(current, 1)
  }
  return keys
}
