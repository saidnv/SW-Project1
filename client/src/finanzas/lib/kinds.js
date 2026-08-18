export const ITEM_KINDS = [
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'yape', label: 'Yape crédito' },
  { id: 'otros', label: 'Otros' },
]

export const CARD_COLORS = [
  '#1e3a5f',
  '#171717',
  '#6b1d2a',
  '#1f4d3a',
  '#3d2a5c',
  '#0f4c5c',
  '#8a6d3b',
  '#1d4ed8',
  '#7a3144',
  '#334155',
]

export const DEFAULT_CARD_COLOR = CARD_COLORS[0]
export const DEFAULT_KIND = 'otros'

export function kindOf(item) {
  return ITEM_KINDS.some((kind) => kind.id === item?.kind) ? item.kind : DEFAULT_KIND
}

export function kindLabel(kind) {
  return ITEM_KINDS.find((item) => item.id === kind)?.label ?? 'Otros'
}

export function isTarjeta(item) {
  return kindOf(item) === 'tarjeta'
}

export function cardColorOf(item) {
  return item?.color || DEFAULT_CARD_COLOR
}

export function resolveTarjeta(item, deudas = []) {
  if (isTarjeta(item)) {
    return { name: item.name, color: cardColorOf(item) }
  }
  if (!item?.deudaId) return null
  const deuda = deudas.find((row) => row.id === item.deudaId)
  if (!isTarjeta(deuda)) return null
  return { name: deuda.name, color: cardColorOf(deuda) }
}

export function cardFieldsFrom(deuda) {
  if (!isTarjeta(deuda)) {
    return { kind: kindOf(deuda), color: null }
  }
  return { kind: 'tarjeta', color: cardColorOf(deuda) }
}
