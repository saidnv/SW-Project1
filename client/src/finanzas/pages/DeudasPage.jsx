import { useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import AmountBadge from '../components/AmountBadge'
import Field, { inputClass } from '../components/Field'
import HistoryList from '../components/HistoryList'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles, parseAmount, sumAmounts } from '../lib/money'

const emptyForm = { name: '', amount: '' }

function paidPct(item) {
  if (!item.originalAmount) return 0
  return ((item.originalAmount - item.amount) / item.originalAmount) * 100
}

export default function DeudasPage() {
  const { account, addDeuda, updateDeuda, removeDeuda } = useFinanzas()
  const items = account.data.deudas
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const amounts = items.map((item) => item.amount)

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    if (editingId) {
      updateDeuda(editingId, { name, amount })
    } else {
      addDeuda({ name, amount })
    }
    closeForm()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({ name: item.name, amount: String(item.amount) })
    setFormOpen(true)
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Deudas totales"
        subtitle={
          <>
            Saldo pendiente: <span className="font-semibold text-[var(--fnz-danger)]">{formatSoles(sumAmounts(items))}</span>
          </>
        }
      />

      <AddFormPanel
        open={formOpen}
        editing={Boolean(editingId)}
        addLabel="Agregar deuda"
        editLabel="Editar deuda"
        onOpen={() => setFormOpen(true)}
        onClose={closeForm}
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <Field label="Tipo o nombre de la deuda">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Monto (S/)">
            <input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <div className="flex items-end gap-2 sm:flex-col sm:items-stretch">
            <button type="submit" className={`${btnPrimary} w-full`}>
              {editingId ? 'Guardar' : 'Agregar'}
            </button>
            {editingId && (
              <button type="button" onClick={closeForm} className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </AddFormPanel>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
              <div className="flex items-start gap-1">
                <AmountBadge amount={item.amount} amounts={amounts} />
                <RowMenu onEdit={() => startEdit(item)} onDelete={() => removeDeuda(item.id)} />
              </div>
            </div>
            <p className="mt-3 text-[15px] text-[var(--fnz-muted)]">
              Original {formatSoles(item.originalAmount)} · Pendiente {formatSoles(item.amount)}
            </p>
            <div className="mt-3">
              <ProgressBar value={paidPct(item)} label="Pagado según pagos marcados como pagados" />
            </div>
          </li>
        ))}
        {!items.length && <p className={empty}>No hay deudas registradas.</p>}
      </ul>

      <div>
        <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Historial</h3>
        <HistoryList items={account.data.history} module="deudas" />
      </div>
    </section>
  )
}
