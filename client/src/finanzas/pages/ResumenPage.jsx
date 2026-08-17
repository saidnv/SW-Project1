import { Link } from 'react-router-dom'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles } from '../lib/money'
import { formatMonthKey, currentMonthKey } from '../lib/dates'
import { card, PageHeader } from '../components/ui'

function Stat({ label, value, to, accent }) {
  return (
    <Link to={to} className={`${card} block transition hover:-translate-y-0.5`}>
      <p className="text-[13px] text-[var(--fnz-muted)]">{label}</p>
      <p className={`mt-2 text-[24px] font-semibold tracking-tight ${accent || 'text-[var(--fnz-text)]'}`}>{value}</p>
    </Link>
  )
}

export default function ResumenPage() {
  const { totals } = useFinanzas()
  const remainderPositive = totals.remainder >= 0

  return (
    <section className="space-y-5">
      <PageHeader
        title="Resumen"
        subtitle={`Montos en soles peruanos (S/). Mes actual: ${formatMonthKey(currentMonthKey())}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Líneas o créditos" value={formatSoles(totals.creditos)} to="/finanzas/creditos" />
        <Stat label="Deudas totales" value={formatSoles(totals.deudas)} to="/finanzas/deudas" accent="text-[var(--fnz-danger)]" />
        <Stat label="Pagos pagados del mes" value={formatSoles(totals.pagosMes)} to="/finanzas/pagos" />
        <Stat label="Ingresos del mes" value={formatSoles(totals.ingresosMes)} to="/finanzas/ingresos" accent="text-[var(--fnz-success)]" />
        <Stat label="Ahorros" value={formatSoles(totals.ahorros)} to="/finanzas/ahorros" accent="text-[var(--fnz-accent)]" />
        <div className={card}>
          <p className="text-[13px] text-[var(--fnz-muted)]">Ingresos − pagos del mes</p>
          <p className={`mt-2 text-[24px] font-semibold tracking-tight ${remainderPositive ? 'text-[var(--fnz-success)]' : 'text-[var(--fnz-danger)]'}`}>
            {formatSoles(totals.remainder)}
          </p>
        </div>
      </div>
    </section>
  )
}
