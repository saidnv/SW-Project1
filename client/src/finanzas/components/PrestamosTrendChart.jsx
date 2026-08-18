import DualLineChart from './DualLineChart'

const SERIES = [
  { key: 'fondo', label: 'Fondo', color: 'var(--fnz-muted)', dashed: true },
  { key: 'prestado', label: 'Prestado', color: 'var(--fnz-accent)' },
  { key: 'siCobra', label: 'Si cobras todo', color: 'var(--fnz-success)' },
]

export default function PrestamosTrendChart({ points, hasData }) {
  return (
    <DualLineChart
      eyebrow="Préstamos mes a mes"
      title="Fondo, prestado y cobro total"
      points={points}
      hasData={hasData}
      series={SERIES}
      empty="Define un fondo para prestar y registra préstamos. Aquí verás el avance mes a mes."
      footer="La línea punteada es el fondo que definiste. La azul es lo que está prestado. La verde es lo que tendrías si cobras todos los préstamos, con interés."
    />
  )
}
