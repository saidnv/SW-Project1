const solesFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatSoles(value) {
  const amount = Number(value) || 0
  return solesFormatter.format(amount)
}

export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.')
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? amount : 0
}

export function sumAmounts(items, key = 'amount') {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0)
}

export function amountTone(amount, amounts) {
  if (!amounts.length) return 'mid'
  if (amounts.length === 1) return Number(amount) >= amounts[0] ? 'large' : 'small'

  const sorted = [...amounts].sort((a, b) => a - b)
  const low = sorted[Math.floor((sorted.length - 1) * 0.33)]
  const high = sorted[Math.floor((sorted.length - 1) * 0.66)]

  if (amount <= low) return 'small'
  if (amount >= high) return 'large'
  return 'mid'
}

export const TONE_CLASSES = {
  small: 'bg-emerald-50 text-emerald-700',
  mid: 'bg-amber-50 text-amber-700',
  large: 'bg-rose-50 text-rose-700',
}

export const TONE_LABELS = {
  small: 'Monto bajo',
  mid: 'Monto medio',
  large: 'Monto alto',
}
