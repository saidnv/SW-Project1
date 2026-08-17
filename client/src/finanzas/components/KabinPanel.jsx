import { getKabinGuide } from '../lib/kabin'
import { formatSoles } from '../lib/money'
import { useFinanzas } from '../context/FinanzasContext'
import { card } from './ui'

const TONE = {
  info: 'bg-[var(--fnz-input)] text-[var(--fnz-text)]',
  ok: 'bg-emerald-50 text-emerald-800',
  warn: 'bg-amber-50 text-amber-800',
  alert: 'bg-rose-50 text-rose-800',
}

export default function KabinPanel({ section }) {
  const { kabin } = useFinanzas()
  const steps = getKabinGuide(section)

  return (
    <aside className={card}>
      <p className="text-[13px] font-medium text-[var(--fnz-accent)]">Asistente</p>
      <h2 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--fnz-text)]">Kabin</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-[var(--fnz-muted)]">
        Guía paso a paso. No es IA: usa reglas de tu dinero en soles.
      </p>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[var(--fnz-text)]/80">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="mt-5 space-y-2">
        {kabin.messages.map((message) => (
          <div key={message.title} className={`rounded-2xl px-3.5 py-3 text-[14px] ${TONE[message.tone]}`}>
            <p className="font-semibold">{message.title}</p>
            <p className="mt-1 leading-relaxed opacity-90">{message.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12px] text-[var(--fnz-muted)]">
        Ingresos del mes {formatSoles(kabin.totalIngresos)} · Pagos {formatSoles(kabin.totalPagos)} ·
        Remanente {formatSoles(kabin.remainder)}
      </p>
    </aside>
  )
}
