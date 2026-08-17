import { useState } from 'react'
import Field, { inputClass } from '../components/Field'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { currentMonthKey, formatMonthKey, inMonth } from '../lib/dates'
import { formatSoles, parseAmount, sumAmounts } from '../lib/money'

const emptyForm = { name: '', amount: '' }

export default function IngresosPage() {
  const { account, totals, addIngreso, updateIngreso, removeIngreso } = useFinanzas()
  const items = account.data.ingresos
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const month = currentMonthKey()
  const ofMonth = items.filter((item) => inMonth(item.createdAt, month))

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    if (editingId) {
      updateIngreso(editingId, { name, amount })
      setEditingId(null)
    } else {
      addIngreso({ name, amount })
    }
    setForm(emptyForm)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({ name: item.name, amount: String(item.amount) })
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Sueldo o ingresos"
        subtitle={
          <>
            {formatMonthKey(month)}: ingresos {formatSoles(sumAmounts(ofMonth))} − pagos pagados{' '}
            {formatSoles(totals.pagosMes)} ={' '}
            <span className={`font-semibold ${totals.remainder >= 0 ? 'text-[var(--fnz-success)]' : 'text-[var(--fnz-danger)]'}`}>
              {formatSoles(totals.remainder)}
            </span>
          </>
        }
      />

      <form onSubmit={submit} className={`${card} grid gap-3 sm:grid-cols-[1fr_140px_auto]`}>
        <Field label="Tipo o nombre">
          <input
            className={inputClass}
            placeholder="Sueldo, extra, etc."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Monto (S/)">
          <input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <button type="submit" className={`${btnPrimary} w-full`}>
            {editingId ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
              <div className="flex items-start gap-1">
                <p className="pt-0.5 text-[22px] font-bold tabular-nums text-[var(--fnz-success)]">{formatSoles(item.amount)}</p>
                <RowMenu onEdit={() => startEdit(item)} onDelete={() => removeIngreso(item.id)} />
              </div>
            </div>
          </li>
        ))}
        {!items.length && <p className={empty}>No hay ingresos registrados.</p>}
      </ul>
    </section>
  )
}
