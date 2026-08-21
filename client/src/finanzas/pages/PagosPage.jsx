import { useEffect, useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import AmountBadge from '../components/AmountBadge'
import CloseMonthCard from '../components/CloseMonthCard'
import Field, { inputClass } from '../components/Field'
import LoanClaimModal from '../components/LoanClaimModal'
import MonthHistory from '../components/MonthHistory'
import PlasticCard from '../components/PlasticCard'
import ReceivedLoansPanel from '../components/ReceivedLoansPanel'
import RowMenu from '../components/RowMenu'
import { btnPrimary, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatMonthKey } from '../lib/dates'
import { isTarjeta, kindLabel, kindOf, resolveTarjeta } from '../lib/kinds'
import { formatSoles, parseAmount } from '../lib/money'
import { isPagoPaid } from '../lib/pagos'
import { inPeriod, openPeriod } from '../lib/period'

const emptyForm = { name: '', amount: '', deudaId: '', manual: false }

function PaidSwitch({ paid, onChange, tone = 'default' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={paid}
      onClick={() => onChange(!paid)}
      className={`flex items-center gap-2 text-[13px] font-medium ${
        tone === 'light' ? 'text-white' : 'text-[var(--fnz-text)]'
      }`}
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
  const { account, totals, addPago, setPagoPaid, updatePago, removePago, closeMonth, claimLoanPayment, refreshAccount } = useFinanzas()
  const period = openPeriod(account.data)
  const items = account.data.pagos.filter((item) => inPeriod(item, period))
  const deudas = account.data.deudas
  const receivedLoans = account.data.prestamosRecibidos || []
  const pending = items.filter((item) => !isPagoPaid(item))
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [claiming, setClaiming] = useState(null)
  const amounts = items.map((item) => item.amount)

  useEffect(() => {
    refreshAccount()
    function onVisible() {
      if (document.visibilityState === 'visible') refreshAccount()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshAccount])

  function selectedDebtName(deudaId) {
    return deudas.find((item) => item.id === deudaId)?.name ?? ''
  }

  const selectedDeuda = deudas.find((item) => item.id === form.deudaId)
  const selectedTarjeta = selectedDeuda && isTarjeta(selectedDeuda) ? selectedDeuda : null

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function submit(event) {
    event.preventDefault()
    const deudaId = form.manual ? null : form.deudaId || null
    const name = form.manual ? form.name.trim() : selectedDebtName(deudaId) || form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    if (editingId) {
      updatePago(editingId, { name, amount, deudaId })
    } else {
      addPago({ name, amount, deudaId })
    }
    closeForm()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      amount: String(item.amount),
      deudaId: item.deudaId || '',
      manual: !item.deudaId,
    })
    setFormOpen(true)
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Pagos mensuales"
        subtitle={
          <>
            {formatMonthKey(period)}: pagados{' '}
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

      <CloseMonthCard
        periodKey={period}
        ready={items.length > 0 && pending.length === 0}
        onCloseMonth={closeMonth}
      />

      <ReceivedLoansPanel
        loans={receivedLoans}
        onClaim={setClaiming}
      />

      {receivedLoans.length ? (
        <h3 className="px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">
          Pagos mensuales
        </h3>
      ) : null}

      <AddFormPanel
        open={formOpen}
        editing={Boolean(editingId)}
        addLabel="Crear pago"
        editLabel="Editar pago"
        onOpen={() => setFormOpen(true)}
        onClose={closeForm}
      >
        <form onSubmit={submit} className="space-y-3">
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
            <Field label="Nombre">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="Deuda (desde deudas totales)">
                <select className={inputClass} value={form.deudaId} onChange={(e) => setForm({ ...form, deudaId: e.target.value })}>
                  <option value="">Selecciona una deuda</option>
                  {deudas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {kindLabel(kindOf(item))} · pendiente {formatSoles(item.amount)}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedTarjeta ? (
                <PlasticCard name={selectedTarjeta.name} color={selectedTarjeta.color} amount={selectedDeuda?.amount} />
              ) : null}
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Monto del pago (S/)">
              <input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <div className="flex items-end gap-2 sm:flex-col sm:items-stretch">
              <button type="submit" className={`${btnPrimary} w-full`}>
                {editingId ? 'Guardar' : 'Crear pago'}
              </button>
              {editingId && (
                <button type="button" onClick={closeForm} className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </AddFormPanel>

      <ul className="space-y-3">
        {items.map((item) => {
          const paid = isPagoPaid(item)
          const tarjeta = resolveTarjeta(item, deudas)
          if (tarjeta) {
            return (
              <li key={item.id}>
                <PlasticCard
                  name={tarjeta.name}
                  amount={item.amount}
                  color={tarjeta.color}
                  actions={<RowMenu tone="light" onEdit={() => startEdit(item)} onDelete={() => removePago(item.id)} />}
                >
                  <div className="flex items-center justify-between gap-3">
                    <PaidSwitch tone="light" paid={paid} onChange={(next) => setPagoPaid(item.id, next)} />
                    {paid && item.deudaId ? (
                      <p className="text-[13px] text-white/80">Descontado {formatSoles(item.appliedAmount || 0)}</p>
                    ) : !paid && item.deudaId ? (
                      <p className="text-[13px] text-white/70">Aún no se descuenta</p>
                    ) : null}
                  </div>
                </PlasticCard>
              </li>
            )
          }
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
        {!items.length && <p className={empty}>No hay pagos en este mes.</p>}
      </ul>

      <div>
        <h3 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Historial por mes</h3>
        <MonthHistory months={account.data.closedMonths} variant="pagos" />
      </div>

      {claiming ? (
        <LoanClaimModal
          loan={claiming}
          onClose={() => setClaiming(null)}
          onConfirm={(payload) => {
            const result = claimLoanPayment(claiming.id, payload)
            if (!result.ok) return result
            setClaiming(null)
            return result
          }}
        />
      ) : null}
    </section>
  )
}
