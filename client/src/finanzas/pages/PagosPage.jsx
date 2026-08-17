import { useState } from 'react'
import AmountBadge from '../components/AmountBadge'
import Field, { inputClass } from '../components/Field'
import HistoryList from '../components/HistoryList'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { currentMonthKey, formatMonthKey, inMonth } from '../lib/dates'
import { formatSoles, parseAmount } from '../lib/money'
import { isPagoPaid } from '../lib/pagos'

const emptyForm = { name: '', amount: '', deudaId: '', manual: false }

function PaidSwitch({ paid, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={paid}
      onClick={() => onChange(!paid)}
      className="flex items-center gap-2 text-[13px] font-medium text-[var(--fnz-text)]"
    >
      <span
        className={`relative h-[31px] w-[51px] rounded-full transition ${paid ? 'bg-[var(--fnz-success)]' : 'bg-[var(--fnz-input)]'}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition ${
            paid ? 'translate-x-5' : ''
          }`}
        />
      </span>
      {paid ? 'Pagado' : 'Pendiente'}
    </button>
  )
}

export default function PagosPage() {
  const { account, totals, addPago, setPagoPaid, updatePago, removePago } = useFinanzas()
  const items = account.data.pagos
  const deudas = account.data.deudas
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const month = currentMonthKey()
  const ofMonth = items.filter((item) => inMonth(item.createdAt, month))
  const amounts = ofMonth.map((item) => item.amount)

  function selectedDebtName(deudaId) {
    return deudas.find((item) => item.id === deudaId)?.name ?? ''
  }

  function submit(event) {
    event.preventDefault()
    const deudaId = form.manual ? null : form.deudaId || null
    const name = form.manual ? form.name.trim() : selectedDebtName(deudaId) || form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    if (editingId) {
      updatePago(editingId, { name, amount, deudaId })
      setEditingId(null)
    } else {
      addPago({ name, amount, deudaId })
    }
    setForm(emptyForm)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      amount: String(item.amount),
      deudaId: item.deudaId || '',
      manual: !item.deudaId,
    })
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Pagos mensuales"
        subtitle={
          <>
            {formatMonthKey(month)}: pagados{' '}
            <span className="font-semibold text-[var(--fnz-success)]">{formatSoles(totals.pagosMes)}</span>
            {totals.pagosPendientesMes > 0 && (
              <>
                {' '}
                · pendientes <span className="font-semibold text-[var(--fnz-warn)]">{formatSoles(totals.pagosPendientesMes)}</span>
              </>
            )}
          </>
        }
      />

      <form onSubmit={submit} className={`${card} space-y-3`}>
        <p className="text-[15px] text-[var(--fnz-muted)]">
          Al crear el pago queda en pendiente. Márcalo como pagado cuando salga el dinero.
        </p>
        <label className="flex items-center gap-2 text-[15px] text-[var(--fnz-text)]">
          <input
            type="checkbox"
            checked={form.manual}
            onChange={(e) => setForm({ ...form, manual: e.target.checked, deudaId: '' })}
          />
          Ingresar nombre de forma manual
        </label>
        {form.manual ? (
          <Field label="Tipo de deuda o nombre">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
        ) : (
          <Field label="Deuda (desde deudas totales)">
            <select className={inputClass} value={form.deudaId} onChange={(e) => setForm({ ...form, deudaId: e.target.value })}>
              <option value="">Selecciona una deuda</option>
              {deudas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · pendiente {formatSoles(item.amount)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Monto del pago (S/)">
            <input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <button type="submit" className={`${btnPrimary} w-full`}>
              {editingId ? 'Guardar' : 'Crear pago'}
            </button>
          </div>
        </div>
      </form>

      <ul className="space-y-3">
        {items.map((item) => {
          const paid = isPagoPaid(item)
          return (
            <li key={item.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pt-1 text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                  {paid && item.deudaId && (
                    <p className="mt-1 text-[13px] text-[var(--fnz-accent)]">
                      Descontado de la deuda: {formatSoles(item.appliedAmount || 0)}
                    </p>
                  )}
                  {!paid && item.deudaId && (
                    <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">Ligada a una deuda. Aún no se descuenta.</p>
                  )}
                </div>
                <div className="flex items-start gap-1">
                  <div className="flex flex-col items-end gap-2">
                    <PaidSwitch paid={paid} onChange={(next) => setPagoPaid(item.id, next)} />
                    <AmountBadge amount={item.amount} amounts={amounts.length ? amounts : items.map((row) => row.amount)} />
                  </div>
                  <RowMenu onEdit={() => startEdit(item)} onDelete={() => removePago(item.id)} />
                </div>
              </div>
            </li>
          )
        })}
        {!items.length && <p className={empty}>No hay pagos registrados.</p>}
      </ul>

      <div>
        <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Historial</h3>
        <HistoryList items={account.data.history} module="pagos" />
      </div>
    </section>
  )
}
