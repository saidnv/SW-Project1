import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles } from '../lib/money'
import { formatMonthKey } from '../lib/dates'
import { openPeriod } from '../lib/period'
import { buildMonthlyTrend, buildPrestamosTrend } from '../lib/trend'
import { PageHeader } from '../components/ui'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import PrestamosTrendChart from '../components/PrestamosTrendChart'
import GoalsTrendPanel from '../components/GoalsTrendPanel'
import DueSoonLoans from '../components/DueSoonLoans'
import { remainingToLend } from '../lib/prestamos'

const statCard =
  'rounded-2xl bg-[var(--fnz-card)] px-3.5 py-3 shadow-[var(--fnz-shadow)] transition-colors duration-500'

function Stat({ label, value, to, accent, hint, hintTone }) {
  const body = (
    <>
      <p className="text-[12px] leading-tight text-[var(--fnz-muted)]">{label}</p>
      <p className={`mt-1 text-[17px] font-semibold tracking-tight ${accent || 'text-[var(--fnz-text)]'}`}>{value}</p>
      {hint ? (
        <span
          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            hintTone || 'bg-[var(--fnz-input)] text-[var(--fnz-muted)]'
          }`}
        >
          {hint}
        </span>
      ) : null}
    </>
  )

  if (!to) {
    return <div className={statCard}>{body}</div>
  }

  return (
    <Link to={to} className={`${statCard} block transition hover:-translate-y-0.5`}>
      {body}
    </Link>
  )
}

export default function ResumenPage() {
  const { totals, account, isSectionVisible } = useFinanzas()
  const remainderPositive = totals.remainder >= 0
  const afterMonthPayments = totals.remainder - totals.pagosPendientesMes
  const afterPositive = afterMonthPayments >= 0
  const trend = useMemo(() => buildMonthlyTrend(account?.data), [account])
  const prestamosTrend = useMemo(() => buildPrestamosTrend(account?.data), [account])
  const prestamos = account?.data.prestamos ?? []
  const prestamoLibre = remainingToLend(totals.prestamoDisponible, prestamos)
  const showDeudas = isSectionVisible('deudas')
  const showAhorros = isSectionVisible('ahorros')
  const showPrestamos = isSectionVisible('prestamos')
  const trendSeries = [
    showDeudas ? { key: 'deudas', label: 'Deudas', color: 'var(--fnz-danger)' } : null,
    showAhorros ? { key: 'ahorros', label: 'Ahorros', color: 'var(--fnz-accent)' } : null,
  ].filter(Boolean)
  const trendHasData = trend.points.some((point) =>
    trendSeries.some((item) => Number(point[item.key]) > 0),
  )

  return (
    <section className="space-y-4">
      <PageHeader
        title="Resumen"
        subtitle={`Montos en soles (S/). ${formatMonthKey(openPeriod(account?.data))}.`}
      />

      {showPrestamos ? <DueSoonLoans prestamos={prestamos} /> : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {isSectionVisible('creditos') ? (
          <Stat label="Líneas o créditos" value={formatSoles(totals.creditos)} to="/finanzas/creditos" />
        ) : null}
        {showDeudas ? (
          <Stat label="Deudas totales" value={formatSoles(totals.deudas)} to="/finanzas/deudas" accent="text-[var(--fnz-danger)]" />
        ) : null}
        {isSectionVisible('pagos') ? (
          <Stat
            label="Pagos del mes"
            value={formatSoles(totals.pagosMes)}
            to="/finanzas/pagos"
            hint={`Por pagar ${formatSoles(totals.pagosPendientesMes)}`}
            hintTone="bg-amber-50 text-[var(--fnz-warn)]"
          />
        ) : null}
        {isSectionVisible('ingresos') ? (
          <Stat label="Ingresos del mes" value={formatSoles(totals.ingresosMes)} to="/finanzas/ingresos" accent="text-[var(--fnz-success)]" />
        ) : null}
        {showAhorros ? (
          <Stat label="Ahorros" value={formatSoles(totals.ahorros)} to="/finanzas/ahorros" accent="text-[var(--fnz-accent)]" />
        ) : null}
        {showPrestamos ? (
          <Stat
            label="Para prestar"
            value={formatSoles(prestamoLibre)}
            to="/finanzas/prestamos"
            hint={totals.prestamos > 0 ? `Prestado ${formatSoles(totals.prestamos)}` : 'Fondo aparte del ahorro'}
            hintTone="bg-[var(--fnz-accent-soft)] text-[var(--fnz-accent)]"
          />
        ) : null}
        <Stat
          label="Disponible"
          value={formatSoles(totals.remainder)}
          accent={remainderPositive ? 'text-[var(--fnz-success)]' : 'text-[var(--fnz-danger)]'}
          hint={`Si pagas el mes ${formatSoles(afterMonthPayments)}`}
          hintTone={afterPositive ? 'bg-emerald-50 text-[var(--fnz-success)]' : 'bg-rose-50 text-[var(--fnz-danger)]'}
        />
      </div>

      {trendSeries.length ? (
        <MonthlyTrendChart points={trend.points} hasData={trendHasData} series={trendSeries} />
      ) : null}
      {showPrestamos ? (
        <PrestamosTrendChart points={prestamosTrend.points} hasData={prestamosTrend.hasData} />
      ) : null}
      {showAhorros ? <GoalsTrendPanel goals={account?.data.ahorros ?? []} /> : null}
    </section>
  )
}
