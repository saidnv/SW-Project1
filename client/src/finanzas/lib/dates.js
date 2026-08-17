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
