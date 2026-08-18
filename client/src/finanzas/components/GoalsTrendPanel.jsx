import { useMemo, useState } from 'react'
import { formatSoles } from '../lib/money'
import { buildGoalTrend } from '../lib/trend'
import DualLineChart from './DualLineChart'
import { card } from './ui'

const SERIES = [
  { key: 'actual', label: 'Ahorrado', color: 'var(--fnz-accent)' },
  { key: 'goal', label: 'Meta', color: 'var(--fnz-success)', dashed: true },
]

export default function GoalsTrendPanel({ goals }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = goals.find((item) => item.id === selectedId) ?? null
  const trend = useMemo(() => (selected ? buildGoalTrend(selected) : { points: [], hasData: false }), [selected])

  if (!goals.length) {
    return (
      <div className={card}>
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Metas</p>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">Avance por meta</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          Crea una meta en Ahorros. Aquí aparecerán como tarjetas; al tocar una verás su gráfico.
        </p>
      </div>
    )
  }

  if (selected) {
    const pct = selected.goalAmount ? Math.round((selected.amount / selected.goalAmount) * 100) : null
    return (
      <DualLineChart
        extra={
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mb-2 text-[14px] font-medium text-[var(--fnz-accent)]"
          >
            ← Ver metas
          </button>
        }
        eyebrow="Meta seleccionada"
        title={selected.name}
        points={trend.points}
        hasData={trend.hasData}
        series={SERIES}
        empty="Esta meta aún no tiene montos para graficar."
        footer={
          pct != null
            ? `Llevas ${formatSoles(selected.amount)} de ${formatSoles(selected.goalAmount)} (${pct}%). La línea punteada es la meta.`
            : `Llevas ${formatSoles(selected.amount)}. La línea punteada es el ritmo u objetivo de la meta.`
        }
      />
    )
  }

  return (
    <div className={card}>
      <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Metas</p>
      <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">Avance por meta</h3>
      <p className="mt-1 text-[14px] text-[var(--fnz-muted)]">Toca una tarjeta para ver su gráfico mes a mes.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const pct = goal.goalAmount ? Math.min(100, Math.round((goal.amount / goal.goalAmount) * 100)) : null
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedId(goal.id)}
              className="rounded-2xl bg-[var(--fnz-input)] p-3 text-left transition hover:-translate-y-0.5"
            >
              {goal.image ? (
                <img src={goal.image} alt="" className="mb-2 h-14 w-full rounded-xl object-cover" />
              ) : null}
              <p className="truncate text-[14px] font-semibold text-[var(--fnz-text)]">{goal.name}</p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--fnz-accent)]">
                {formatSoles(goal.amount)}
              </p>
              {goal.goalAmount ? (
                <p className="text-[12px] text-[var(--fnz-muted)]">de {formatSoles(goal.goalAmount)}</p>
              ) : (
                <p className="text-[12px] text-[var(--fnz-muted)]">Sin meta total</p>
              )}
              {pct != null ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--fnz-card)]">
                  <div className="h-full rounded-full bg-[var(--fnz-success)]" style={{ width: `${pct}%` }} />
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
