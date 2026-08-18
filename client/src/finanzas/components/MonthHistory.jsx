import { useState } from 'react'
import { formatMonthKey } from '../lib/dates'
import { formatSoles } from '../lib/money'
import { card } from './ui'

export default function MonthHistory({ months, variant = 'pagos' }) {
  const [openId, setOpenId] = useState(months[0]?.id ?? null)
  const items = [...(months || [])].sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))

  if (!items.length) {
    return (
      <p className="text-[15px] text-[var(--fnz-muted)]">
        Aún no hay meses cerrados. Cuando marques todos los pagos como pagados, cierra el mes para guardarlo aquí.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((month) => {
        const expanded = openId === month.id
        const rows = variant === 'deudas' ? month.deudas : month.pagos
        return (
          <li key={month.id} className={card}>
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : month.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-[16px] font-semibold capitalize text-[var(--fnz-text)]">
                  {formatMonthKey(month.monthKey)}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--fnz-muted)]">
                  {variant === 'deudas'
                    ? `Deudas al cierre ${formatSoles(month.totals?.deudas || 0)}`
                    : `Pagos ${formatSoles(month.totals?.pagos || 0)} · Ingresos ${formatSoles(month.totals?.ingresos || 0)}`}
                </p>
              </div>
              <span className="text-[18px] text-[var(--fnz-muted)]">{expanded ? '▾' : '›'}</span>
            </button>
            {expanded ? (
              <ul className="mt-3 space-y-2 border-t border-[var(--fnz-line)] pt-3">
                {(rows || []).map((row) => (
                  <li key={row.id || row.name} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-[var(--fnz-text)]">{row.name}</span>
                    <span className="font-semibold tabular-nums text-[var(--fnz-text)]">{formatSoles(row.amount)}</span>
                  </li>
                ))}
                {!rows?.length ? (
                  <li className="text-[14px] text-[var(--fnz-muted)]">Sin movimientos en este mes.</li>
                ) : null}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
