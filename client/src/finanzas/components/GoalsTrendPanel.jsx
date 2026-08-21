import { useMemo, useState } from 'react'
import { formatDayShort, formatMonthShort } from '../lib/dates'
import { formatSoles } from '../lib/money'
import { isSharedAhorro, memberLabel } from '../lib/sharedAhorro'
import { buildGoalTrend } from '../lib/trend'
import DualLineChart from './DualLineChart'
import ProgressBar from './ProgressBar'
import { card } from './ui'

const SERIES = [
  { key: 'actual', label: 'Ahorrado', color: 'var(--fnz-accent)' },
  { key: 'goal', label: 'Meta', color: 'var(--fnz-success)', dashed: true },
]

function formatGoalAxis(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDayShort(value)
  return formatMonthShort(value)
}

function goalPct(goal) {
  const goalAmount = Number(goal.goalAmount) || 0
  const saved = Number(goal.amount) || 0
  if (goalAmount <= 0) return null
  return (saved / goalAmount) * 100
}

export default function GoalsTrendPanel({ goals }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = goals.find((item) => item.id === selectedId) ?? null
  const trend = useMemo(() => {
    if (!selected) return { points: [], hasData: false }
    return buildGoalTrend(selected)
  }, [selected])

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
    const goalAmount = Number(selected.goalAmount) || 0
    const saved = Number(selected.amount) || 0
    const pct = goalPct(selected)
    const remaining = goalAmount ? Math.max(0, goalAmount - saved) : null
    const reached = goalAmount > 0 && saved >= goalAmount
    const shared = isSharedAhorro(selected)
    return (
      <DualLineChart
        extra={
          <div className="mb-3 space-y-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-[15px] font-medium text-[var(--fnz-accent)] sm:text-[14px]"
            >
              ← Ver metas
            </button>
            {shared ? (
              <p className="text-[13px] leading-snug text-[var(--fnz-muted)]">
                <span className="rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 font-semibold text-[var(--fnz-accent)]">
                  Compartida
                </span>
                <span className="ml-2">{memberLabel(selected)}</span>
              </p>
            ) : null}
            {pct != null ? (
              <ProgressBar
                value={pct}
                label={reached ? 'Meta alcanzada' : `Faltan ${formatSoles(remaining)}`}
              />
            ) : null}
          </div>
        }
        eyebrow="Meta seleccionada"
        title={selected.name}
        points={trend.points}
        hasData={trend.hasData}
        series={SERIES}
        formatKey={formatGoalAxis}
        target={goalAmount}
        empty="Esta meta aún no tiene montos para graficar."
        footer={
          reached
            ? `Llegaste a ${formatSoles(saved)}. Cada punto es un aporte.`
            : goalAmount
              ? shared
                ? `Todos ven el mismo ahorro. La verde es la meta (${formatSoles(goalAmount)}). Toca un punto para ver quién aportó.`
                : `La línea verde de arriba es la meta (${formatSoles(goalAmount)}). La azul une cada aporte hasta ese tope.`
              : `Llevas ${formatSoles(saved)}. Cada punto es un aporte.`
        }
      />
    )
  }

  return (
    <div className={card}>
      <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Metas</p>
      <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">Avance por meta</h3>
      <p className="mt-1 text-[14px] text-[var(--fnz-muted)]">Toca una tarjeta para ver cómo el ahorro sube hacia la meta.</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const pct = goalPct(goal)
          const shared = isSharedAhorro(goal)
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedId(goal.id)}
              className="rounded-2xl bg-[var(--fnz-input)] p-3.5 text-left transition hover:-translate-y-0.5"
            >
              {goal.image ? (
                <img src={goal.image} alt="" className="mb-2 h-20 w-full rounded-xl object-cover sm:h-14" />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[16px] font-semibold text-[var(--fnz-text)] sm:text-[14px]">{goal.name}</p>
                {shared ? (
                  <span className="shrink-0 rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fnz-accent)]">
                    Compartida
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--fnz-accent)] sm:text-[15px]">
                {formatSoles(goal.amount)}
              </p>
              {goal.goalAmount ? (
                <p className="text-[13px] text-[var(--fnz-muted)]">de {formatSoles(goal.goalAmount)}</p>
              ) : (
                <p className="text-[13px] text-[var(--fnz-muted)]">Sin meta total</p>
              )}
              {pct != null ? (
                <div className="mt-2">
                  <ProgressBar value={pct} label="Avance" />
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
