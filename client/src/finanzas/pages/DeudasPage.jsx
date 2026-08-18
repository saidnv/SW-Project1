import { useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import AmountBadge from '../components/AmountBadge'
import KindFields, { emptyKindForm } from '../components/KindFields'
import MonthHistory from '../components/MonthHistory'
import PlasticCard from '../components/PlasticCard'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { DEFAULT_CARD_COLOR, isTarjeta, kindLabel, kindOf } from '../lib/kinds'
import { formatSoles, parseAmount, sumAmounts } from '../lib/money'

function paidPct(item) {
  if (!item.originalAmount) return 0
  return ((item.originalAmount - item.amount) / item.originalAmount) * 100
}

export default function DeudasPage() {
  const { account, addDeuda, updateDeuda, removeDeuda } = useFinanzas()
  const items = account.data.deudas
  const [form, setForm] = useState(emptyKindForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const amounts = items.map((item) => item.amount)

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyKindForm)
  }

  function payload() {
    const name = form.name.trim()
    const amount = parseAmount(form.amount)
    const kind = kindOf(form)
    return {
      name,
      amount,
      kind,
      color: kind === 'tarjeta' ? form.color || DEFAULT_CARD_COLOR : null,
    }
  }

  function submit(event) {
    event.preventDefault()
    const next = payload()
    if (!next.name || next.amount < 0) return
    if (editingId) updateDeuda(editingId, next)
    else addDeuda(next)
    closeForm()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      kind: kindOf(item),
      name: item.name,
      amount: String(item.amount),
      color: item.color || DEFAULT_CARD_COLOR,
    })
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
        <form onSubmit={submit} className="space-y-3">
          <KindFields form={form} setForm={setForm} />
          <div className="flex items-end gap-2">
            <button type="submit" className={`${btnPrimary} w-full`}>
              {editingId ? 'Guardar' : 'Agregar'}
            </button>
            {editingId && (
              <button type="button" onClick={closeForm} className="rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </AddFormPanel>

      <ul className="space-y-3">
        {items.map((item) =>
          isTarjeta(item) ? (
            <li key={item.id}>
              <PlasticCard
                name={item.name}
                amount={item.amount}
                color={item.color}
                actions={<RowMenu tone="light" onEdit={() => startEdit(item)} onDelete={() => removeDeuda(item.id)} />}
              >
                <p className="text-[13px] text-white/75">
                  Original {formatSoles(item.originalAmount)} · Pendiente {formatSoles(item.amount)}
                </p>
                <div className="mt-3">
                  <ProgressBar tone="light" value={paidPct(item)} label="Pagado" />
                </div>
              </PlasticCard>
            </li>
          ) : (
            <li key={item.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                  <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">{kindLabel(kindOf(item))}</p>
                </div>
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
          ),
        )}
        {!items.length && <p className={empty}>No hay deudas registradas.</p>}
      </ul>

      <div>
        <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Historial por mes</h3>
        <MonthHistory months={account.data.closedMonths} variant="deudas" />
      </div>
    </section>
  )
}
