import DualLineChart from './DualLineChart'

const SERIES = [
  { key: 'deudas', label: 'Deudas', color: 'var(--fnz-danger)' },
  { key: 'ahorros', label: 'Ahorros', color: 'var(--fnz-accent)' },
]

export default function MonthlyTrendChart({ points, hasData, series = SERIES, title, footer }) {
  const deudas = series.some((item) => item.key === 'deudas')
  const ahorros = series.some((item) => item.key === 'ahorros')
  const heading = title || (deudas && ahorros ? 'Deudas y ahorros' : deudas ? 'Deudas' : 'Ahorros')
  const note =
    footer ||
    (deudas && ahorros
      ? 'La línea roja es lo que debes al cierre de cada mes. La azul es lo ahorrado. Toca un mes para ver el detalle.'
      : deudas
        ? 'La línea muestra lo que debes al cierre de cada mes. Toca un mes para ver el detalle.'
        : 'La línea muestra lo ahorrado. Toca un mes para ver el detalle.')

  return (
    <DualLineChart
      eyebrow="Avance mes a mes"
      title={heading}
      points={points}
      hasData={hasData}
      series={series}
      empty="Cuando registres deudas o metas de ahorro, aquí verás cómo cambian mes a mes."
      footer={note}
    />
  )
}
