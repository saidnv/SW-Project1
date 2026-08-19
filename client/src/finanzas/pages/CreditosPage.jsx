import { useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import AmountBadge from '../components/AmountBadge'
import KindFields, { emptyKindForm } from '../components/KindFields'
import PlasticCard from '../components/PlasticCard'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { DEFAULT_CARD_COLOR, isTarjeta, kindLabel, kindOf } from '../lib/kinds'
import { formatSoles, parseAmount, sumAmounts } from '../lib/money'

export default function CreditosPage() {
  const { account, addCredito, updateCredito, removeCredito } = useFinanzas()
  const items = account.data.creditos
  const deudas = account.data.deudas
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
    if (editingId) updateCredito(editingId, next)
    else addCredito(next)
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

  function usedAmountFor(creditoId) {
    return deudas
      .filter((d) => d.creditoId === creditoId)
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
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

      <AddFormPanel
        open={formOpen}
        editing={Boolean(editingId)}
        addLabel="Agregar crédito"
        editLabel="Editar crédito"
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
        {items.map((item) => {
          const used = usedAmountFor(item.id)
          const available = Math.max(0, item.amount - used)
          const availableLabel = available > 0 || used > 0 ? `Queda disponible ${formatSoles(available)}` : null
          return isTarjeta(item) ? (
            <li key={item.id}>
              <PlasticCard
                name={item.name}
                amount={item.amount}
                color={item.color}
                actions={<RowMenu tone="light" onEdit={() => startEdit(item)} onDelete={() => removeCredito(item.id)} />}
              >
                {availableLabel ? (
                  <p className="text-[13px] text-white/75">Disponible {formatSoles(available)}</p>
                ) : null}
              </PlasticCard>
            </li>
          ) : (
            <li key={item.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                  <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">{kindLabel(kindOf(item))}</p>
                  {availableLabel ? (
                    <p className="mt-1 text-[13px] text-[var(--fnz-accent)]">{availableLabel}</p>
                  ) : null}
                </div>
                <div className="flex items-start gap-1">
                  <AmountBadge amount={item.amount} amounts={amounts} />
                  <RowMenu onEdit={() => startEdit(item)} onDelete={() => removeCredito(item.id)} />
                </div>
              </div>
            </li>
          )
        })}
        {!items.length && <p className={empty}>No hay líneas de crédito todavía.</p>}
      </ul>
    </section>
  )
}
