import { currentMonthKey, inMonth } from './dates'
import { formatSoles, sumAmounts } from './money'
import { paidPagos } from './pagos'

export function getKabinGuide(section) {
  const guides = {
    resumen: [
      'Empieza por registrar tus deudas totales y tus ingresos del mes.',
      'Luego anota los pagos mensuales para ver cuánto te queda.',
      'Si sobra dinero, te preguntaré si quieres enviarlo a un ahorro.',
    ],
    creditos: [
      'Registra cada línea o crédito con su nombre y monto disponible.',
      'El total se calcula solo. Úsalo como respaldo si un mes no alcanza.',
    ],
    deudas: [
      'Anota el tipo o nombre de cada deuda y su monto.',
      'La barra de progreso sube cuando registras pagos mensuales ligados a esa deuda.',
      'Los colores marcan deudas altas (rojo) y bajas (verde).',
    ],
    pagos: [
      'Crea el pago mensual como pendiente: aún no se descuenta de la deuda.',
      'Cuando lo pagues de verdad, usa el interruptor Pagado / Pendiente.',
      'Solo los pagos marcados como pagados bajan la deuda y se restan de los ingresos.',
    ],
    ingresos: [
      'Registra sueldos u otros ingresos en soles.',
      'Del total de ingresos se restan los pagos del mes.',
      'Si hay remanente, podrás ahorrarlo o dejarlo sin asignar.',
    ],
    ahorros: [
      'Crea metas (viaje, casa, auto, PC) con un monto actual y una meta total.',
      'Puedes fijar un ahorro mensual y agregar una imagen o un enlace.',
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
    pagos: 'Marca Pagado solo cuando salga el dinero.',
    ingresos: 'Registra sueldos e ingresos del mes en soles.',
    ahorros: 'Define meta total y monto actual de cada ahorro.',
    ajustes: 'El tema se guarda en este navegador.',
  }

  return tips[section] ?? tips.resumen
}

export function getPrimaryKabinMessage(messages) {
  if (!messages?.length) return null
  return messages.find((item) => item.important) ?? messages[0]
}

export function getKabinAdvice(data, persona = 'Kabin') {
  const { creditos, deudas, pagos, ingresos, ahorros } = data
  const melody = persona === 'My Melody'
  const month = currentMonthKey()
  const ingresosMes = ingresos.filter((item) => inMonth(item.createdAt, month))
  const pagosMes = paidPagos(pagos.filter((item) => inMonth(item.createdAt, month)))
  const totalIngresos = sumAmounts(ingresosMes)
  const totalPagos = sumAmounts(pagosMes)
  const remainder = totalIngresos - totalPagos
  const totalAhorros = sumAmounts(ahorros)
  const totalCreditos = sumAmounts(creditos)
  const totalDeudas = sumAmounts(deudas)

  const messages = []

  if (!ingresosMes.length && !pagos.length && !deudas.length) {
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
        ? `Después de pagar, te quedan ${formatSoles(remainder)}. Si quieres, lo mandamos a una meta de ahorro. Tú decides.`
        : `Te quedan ${formatSoles(remainder)} después de pagar.`,
    })
  }

  if (totalDeudas > 0) {
    const biggest = [...deudas].sort((a, b) => b.amount - a.amount)[0]
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
