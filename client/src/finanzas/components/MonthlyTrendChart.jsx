import DualLineChart from './DualLineChart'

const SERIES = [
  { key: 'deudas', label: 'Deudas', color: 'var(--fnz-danger)' },
  { key: 'ahorros', label: 'Ahorros', color: 'var(--fnz-accent)' },
]

export default function MonthlyTrendChart({ points, hasData }) {
  return (
    <DualLineChart
      eyebrow="Avance mes a mes"
      title="Deudas y ahorros"
      points={points}
      hasData={hasData}
      series={SERIES}
      empty="Cuando registres deudas o metas de ahorro, aquí verás cómo cambian mes a mes."
      footer="La línea roja es lo que debes al cierre de cada mes. La azul es lo ahorrado. Toca un mes para ver el detalle."
    />
  )
}
