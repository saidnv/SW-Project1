export function isPagoPaid(pago) {
  if (typeof pago?.paid === 'boolean') return pago.paid
  return (pago?.appliedAmount || 0) > 0
}

export function paidPagos(pagos = []) {
  return pagos.filter(isPagoPaid)
}
