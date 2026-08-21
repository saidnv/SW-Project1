import { formatSoles, sumAmounts } from './money'
import { paidPagos } from './pagos'
import { inPeriod, openPeriod } from './period'
import { dueAlertLoans, dueHeadline, remainingToLend, loanOwed, openReceivedLoans, receivedLoanDebtTotal } from './prestamos'

export function getKabinGuide(section) {
  const guides = {
    resumen: [
      'Empieza por registrar tus deudas totales y tus ingresos del mes.',
      'Luego anota los pagos mensuales para ver cuánto te queda.',
      'Si sobra dinero, te preguntaré si quieres enviarlo a un ahorro.',
    ],
    creditos: [
      'Elige el tipo: tarjeta, Yape crédito u otros. Luego pon el nombre y el monto.',
      'Si es tarjeta, se muestra como una card y puedes elegir su color.',
    ],
    deudas: [
      'Separa tipo y nombre. Una deuda de tarjeta también se ve como card.',
      'La barra de progreso sube cuando marcas pagos ligados a esa deuda.',
      'Si un usuario del sistema te prestó, esa deuda aparece aquí con el detalle del préstamo.',
    ],
    pagos: [
      'Crea el pago mensual como pendiente: aún no se descuenta de la deuda.',
      'Cuando lo pagues de verdad, usa el interruptor Pagado / Pendiente.',
      'Solo los pagos marcados como pagados bajan la deuda y se restan de los ingresos.',
      'En los últimos días del mes, si todo está pagado, aparece Cerrar mes.',
    ],
    ingresos: [
      'Registra sueldos u otros ingresos en soles.',
      'Del total de ingresos se restan los pagos del mes.',
      'Si hay remanente, al cerrar el mes podrás pasarlo a una meta.',
    ],
    ahorros: [
      'Crea metas (viaje, casa, auto, PC) con un monto actual y una meta total.',
      'Puedes fijar un ahorro mensual y agregar una imagen o un enlace.',
    ],
    prestamos: [
      'Define primero cuánto dinero tienes apartado para prestar. Ese fondo no se mezcla con el ahorro.',
      'Al crear un préstamo anota a quién, el monto, el interés, la fecha y una foto o constancia.',
      'Si falta un día para vencer, Kabin lo muestra en el resumen.',
      'Cuando te paguen, usa Cobrado y anota quién cobró. El monto vuelve al fondo.',
    ],
    ajustes: [
      'Elige el tema visual. Se guarda en este navegador.',
      'Claro iOS es limpio. My Melody mantiene el fondo claro y pone el rosa en botones y el lazo.',
    ],
  }

  return guides[section] ?? guides.resumen
}

const SECTION_TITLES = {
  resumen: 'Resumen',
  creditos: 'Líneas o créditos',
  deudas: 'Deudas',
  pagos: 'Pagos mensuales',
  ingresos: 'Ingresos',
  ahorros: 'Ahorros',
  prestamos: 'Préstamos',
  ajustes: 'Ajustes',
}

export function getGuideTitle(section) {
  return SECTION_TITLES[section] ?? 'Guía'
}

export function getKabinTip(section) {
  const tips = {
    resumen: 'Completa deudas, ingresos y pagos para ver tu remanente.',
    creditos: 'Registra cada línea con nombre y monto disponible.',
    deudas: 'Los pagos marcados como pagados bajan la deuda.',
    pagos: 'Cierra el mes solo cuando todos los pagos estén pagados.',
    ingresos: 'Registra sueldos e ingresos del mes en soles.',
    ahorros: 'Define meta total y monto actual de cada ahorro.',
    prestamos: 'El fondo para prestar es independiente del ahorro.',
    ajustes: 'El tema se guarda en este navegador.',
  }

  return tips[section] ?? tips.resumen
}

export function getPrimaryKabinMessage(messages) {
  if (!messages?.length) return null
  return messages.find((item) => item.important) ?? messages[0]
}

export function getKabinAdvice(data, persona = 'Kabin') {
  const { creditos, deudas, pagos, ingresos, ahorros, prestamos = [], prestamosRecibidos = [] } = data
  const melody = persona === 'My Melody'
  const month = openPeriod(data)
  const ingresosMes = ingresos.filter((item) => inPeriod(item, month))
  const pagosMes = paidPagos(pagos.filter((item) => inPeriod(item, month)))
  const totalIngresos = sumAmounts(ingresosMes)
  const totalPagos = sumAmounts(pagosMes)
  const remainder = totalIngresos - totalPagos
  const totalAhorros = sumAmounts(ahorros)
  const totalCreditos = sumAmounts(creditos)
  const receivedOpen = openReceivedLoans(prestamosRecibidos)
  const loanDebt = receivedLoanDebtTotal(prestamosRecibidos)
  const totalDeudas = Number((sumAmounts(deudas) + loanDebt).toFixed(2))
  const dueLoans = dueAlertLoans(prestamos)
  const leftoverLend = remainingToLend(data.prestamoDisponible, prestamos)

  const messages = []

  if (!ingresosMes.length && !pagos.length && !deudas.length && !prestamos.length && !receivedOpen.length) {
    messages.push({
      id: 'welcome',
      tone: 'info',
      important: false,
      title: melody ? '¡Hola!' : 'Bienvenido',
      body: melody
        ? 'Soy My Melody. Te voy a acompañar con cariño para ordenar tus soles. Empieza por deudas, pagos e ingresos. Cuando algo sea importante, vengo a contártelo.'
        : 'Completa deudas, pagos e ingresos para empezar.',
    })
    return { remainder, totalIngresos, totalPagos, messages }
  }

  if (dueLoans.length) {
    const first = dueLoans[0]
    messages.push({
      id: `loan-due-${first.id}-${first.dueDate}`,
      tone: 'alert',
      important: true,
      title: melody ? 'Hay un préstamo por cobrar' : 'Préstamo por vencer',
      body: melody
        ? `Mira el resumen: ${dueHeadline(first)}. Con cariño, cobra a tiempo y guarda la constancia.`
        : `${dueHeadline(first)}. Revisa la constancia en Préstamos.`,
    })
  }

  const dueReceived = dueAlertLoans(receivedOpen)
  if (dueReceived.length) {
    const first = dueReceived[0]
    messages.push({
      id: `loan-owed-${first.id}-${first.dueDate}`,
      tone: 'alert',
      important: true,
      title: melody ? 'Tienes un préstamo por pagar' : 'Deuda de préstamo por vencer',
      body: melody
        ? `Le debes ${formatSoles(loanOwed(first))} a ${first.lenderUsername}. Aparece en Deudas.`
        : `Debes ${formatSoles(loanOwed(first))} a ${first.lenderUsername}. Está en Deudas.`,
    })
  }

  if (leftoverLend < 0) {
    messages.push({
      id: 'lend-over',
      tone: 'warn',
      important: false,
      title: melody ? 'Prestaste más del fondo' : 'Fondo de préstamos excedido',
      body: melody
        ? `El dinero apartado para prestar no alcanza. Te pasaste por ${formatSoles(Math.abs(leftoverLend))}. Eso sigue aparte de tus ahorros.`
        : `Te pasaste ${formatSoles(Math.abs(leftoverLend))} del fondo para prestar.`,
    })
  }

  if (remainder < 0) {
    const deficit = Math.abs(remainder)
    const supports = []
    if (totalAhorros > 0) supports.push(`tienes ${formatSoles(totalAhorros)} en ahorros`)
    if (totalCreditos > 0) supports.push(`hay ${formatSoles(totalCreditos)} en líneas de crédito`)
    const help = supports.length
      ? `Revisa ${supports.join(' y ')}.`
      : 'No hay ahorros ni créditos registrados.'

    messages.push({
      id: `deficit-${month}`,
      tone: 'alert',
      important: true,
      title: melody ? 'Este mes se puso apretado' : 'Déficit este mes',
      body: melody
        ? `Los pagos (${formatSoles(totalPagos)}) superan los ingresos (${formatSoles(totalIngresos)}) por ${formatSoles(deficit)}. Tranquila, lo vemos juntas. ${help}`
        : `Te faltan ${formatSoles(deficit)}. Pagos ${formatSoles(totalPagos)} · ingresos ${formatSoles(totalIngresos)}. ${help}`,
    })
  } else if (totalIngresos > 0 && remainder <= totalIngresos * 0.1) {
    const grouped = new Map()
    for (const pago of pagosMes) {
      grouped.set(pago.name, (grouped.get(pago.name) || 0) + pago.amount)
    }
    const top = [...grouped.entries()].sort((a, b) => b[1] - a[1])[0]
    const why = top
      ? `La categoría más alta este mes es “${top[0]}” (${formatSoles(top[1])}).`
      : 'Revisa los pagos más altos del mes.'

    messages.push({
      id: `low-${month}`,
      tone: 'warn',
      important: true,
      title: melody ? 'Casi no queda para ahorrar' : 'El remanente es bajo para ahorrar',
      body: melody
        ? `Te quedan ${formatSoles(remainder)} de ${formatSoles(totalIngresos)}. ${why} El próximo mes, baja un poquito ese gasto y guarda un monto apenas entre el sueldo. Vas muy bien: ya estás midiendo tu dinero.`
        : `Quedan ${formatSoles(remainder)} de ${formatSoles(totalIngresos)}. ${why}`,
    })
  } else if (remainder > 0) {
    messages.push({
      id: `remainder-${month}`,
      tone: 'ok',
      important: false,
      title: melody ? '¡Te quedó un ahorro posible!' : 'Hay remanente',
      body: melody
        ? `Después de pagar, te quedan ${formatSoles(remainder)}. Al cerrar el mes podrás pasarlo a una meta.`
        : `Te quedan ${formatSoles(remainder)}. Al cerrar el mes podrás ahorrarlo.`,
    })
  }

  if (totalDeudas > 0) {
    const loanRows = receivedOpen.map((loan) => ({
      id: loan.id,
      name: `Préstamo de ${loan.lenderUsername}`,
      amount: loanOwed(loan),
    }))
    const biggest = [...deudas, ...loanRows].sort((a, b) => b.amount - a.amount)[0]
    messages.push({
      id: `debt-${biggest.id}`,
      tone: 'info',
      important: false,
      title: melody ? 'Una deuda para cuidar' : 'Deuda a vigilar',
      body: melody
        ? `La deuda más alta ahora es “${biggest.name}”, con ${formatSoles(biggest.amount)} pendientes. Con calma, pago a pago.`
        : `Mayor deuda: “${biggest.name}” (${formatSoles(biggest.amount)}).`,
    })
  }

  return { remainder, totalIngresos, totalPagos, messages }
}
