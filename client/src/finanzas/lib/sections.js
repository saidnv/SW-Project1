export const HIDEABLE_SECTIONS = [
  { id: 'creditos', label: 'Líneas o créditos' },
  { id: 'deudas', label: 'Deudas totales' },
  { id: 'pagos', label: 'Pagos mensuales' },
  { id: 'ingresos', label: 'Sueldo e ingresos' },
  { id: 'ahorros', label: 'Ahorros' },
  { id: 'prestamos', label: 'Préstamos' },
]

export const HIDEABLE_IDS = HIDEABLE_SECTIONS.map((item) => item.id)

export function normalizeHiddenSections(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.filter((id) => HIDEABLE_IDS.includes(id)))]
}

export function isSectionHidden(hiddenSections, id) {
  return normalizeHiddenSections(hiddenSections).includes(id)
}
