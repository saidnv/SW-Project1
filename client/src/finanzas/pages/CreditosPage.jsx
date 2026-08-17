import { useState } from 'react'
import AmountBadge from '../components/AmountBadge'
import Field, { inputClass } from '../components/Field'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles, parseAmount, sumAmounts } from '../lib/money'

const emptyForm = { name: '', amount: '' }

export default function CreditosPage() {
  const { account, addCredito, updateCredito, removeCredito } = useFinanzas()
  const items = account.data.creditos
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const amounts = items.map((item) => item.amount)

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    if (editingId) {
      updateCredito(editingId, { name, amount })
      setEditingId(null)
    } else {
      addCredito({ name, amount })
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
        title="Líneas o créditos"
        subtitle={
          <>
            Total disponible: <span className="font-semibold text-[var(--fnz-text)]">{formatSoles(sumAmounts(items))}</span>
          </>
        }
      />

      <form onSubmit={submit} className={`${card} grid gap-3 sm:grid-cols-[1fr_140px_auto]`}>
        <Field label="Tipo o nombre">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
                <AmountBadge amount={item.amount} amounts={amounts} />
                <RowMenu onEdit={() => startEdit(item)} onDelete={() => removeCredito(item.id)} />
              </div>
            </div>
          </li>
        ))}
        {!items.length && <p className={empty}>No hay líneas de crédito todavía.</p>}
      </ul>
    </section>
  )
}
