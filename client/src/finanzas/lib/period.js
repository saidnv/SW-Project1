import { currentMonthKey, monthKey } from './dates'
import { normalizeHiddenSections } from './sections'

export function itemPeriod(item) {
  return item?.periodKey || (item?.createdAt ? monthKey(item.createdAt) : null)
}

export function openPeriod(ledger) {
  return ledger?.periodKey || currentMonthKey()
}

export function inPeriod(item, periodKey) {
  return itemPeriod(item) === periodKey
}

export function hydrateLedger(data) {
  const source = data && typeof data === 'object' ? data : {}
  const periodKey = source.periodKey || currentMonthKey()
  return {
    creditos: Array.isArray(source.creditos) ? source.creditos : [],
    deudas: Array.isArray(source.deudas) ? source.deudas : [],
    ahorros: Array.isArray(source.ahorros) ? source.ahorros : [],
    prestamos: Array.isArray(source.prestamos) ? source.prestamos : [],
    prestamosRecibidos: Array.isArray(source.prestamosRecibidos) ? source.prestamosRecibidos : [],
    prestamoDisponible: Number(source.prestamoDisponible) || 0,
    history: Array.isArray(source.history) ? source.history : [],
    closedMonths: Array.isArray(source.closedMonths) ? source.closedMonths : [],
    hiddenSections: normalizeHiddenSections(source.hiddenSections),
    periodKey,
    pagos: tagPeriod(source.pagos, periodKey),
    ingresos: tagPeriod(source.ingresos, periodKey),
  }
}

function tagPeriod(list, fallbackPeriod) {
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    ...item,
    periodKey: item.periodKey || fallbackPeriod,
  }))
}
