import { useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import Field, { inputClass } from '../components/Field'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import { btnPrimary, btnText, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatDate } from '../lib/dates'
import { formatSoles, parseAmount } from '../lib/money'

const emptyForm = {
  name: '',
  amount: '',
  goalAmount: '',
  monthlyTarget: '',
  link: '',
  image: '',
}

const emptyDepositForm = {
  amount: '',
  source: '',
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('')
      return
    }
    if (file.size > 700_000) {
      reject(new Error('La imagen debe pesar menos de 700 KB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

export default function AhorrosPage() {
  const { account, addAhorro, updateAhorro, addAhorroDeposit, removeAhorro } = useFinanzas()
  const items = account.data.ahorros
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')

  const [depositAhorroId, setDepositAhorroId] = useState(null)
  const [depositForm, setDepositForm] = useState(emptyDepositForm)
  const [depositOpen, setDepositOpen] = useState(false)

  const [historyAhorroId, setHistoryAhorroId] = useState(null)

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    const name = form.name.trim()
    const amount = parseAmount(form.amount)
    if (!name || amount < 0) return
    const payload = {
      name,
      amount,
      goalAmount: parseAmount(form.goalAmount),
      monthlyTarget: parseAmount(form.monthlyTarget),
      link: form.link.trim(),
      image: form.image,
    }
    if (editingId) {
      updateAhorro(editingId, payload)
    } else {
      addAhorro(payload)
    }
    closeForm()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      amount: String(item.amount),
      goalAmount: item.goalAmount ? String(item.goalAmount) : '',
      monthlyTarget: item.monthlyTarget ? String(item.monthlyTarget) : '',
      link: item.link || '',
      image: item.image || '',
    })
    setFormOpen(true)
  }

  function openDeposit(item) {
    setDepositAhorroId(item.id)
    setDepositForm(emptyDepositForm)
    setDepositOpen(true)
  }

  function closeDeposit() {
    setDepositOpen(false)
    setDepositAhorroId(null)
    setDepositForm(emptyDepositForm)
  }

  function submitDeposit(event) {
    event.preventDefault()
    const amount = parseAmount(depositForm.amount)
    const source = depositForm.source.trim()
    if (!depositAhorroId || amount <= 0) return
    addAhorroDeposit(depositAhorroId, { amount, source })
    closeDeposit()
  }

  function openHistory(item) {
    setHistoryAhorroId(item.id)
  }

  function closeHistory() {
    setHistoryAhorroId(null)
  }

  const historyItem = historyAhorroId ? items.find((item) => item.id === historyAhorroId) : null

  async function onImage(event) {
    try {
      const image = await readImage(event.target.files?.[0])
      setForm((current) => ({ ...current, image }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Ahorros"
        subtitle="Metas en soles. Ejemplos: viaje, casa, auto, PC, ahorros futuros."
      />

      <AddFormPanel
        open={formOpen}
        editing={Boolean(editingId)}
        addLabel="Agregar meta"
        editLabel="Editar meta"
        onOpen={() => setFormOpen(true)}
        onClose={closeForm}
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo o nombre">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Monto actual (S/)">
            <input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Meta total (S/)">
            <input className={inputClass} inputMode="decimal" value={form.goalAmount} onChange={(e) => setForm({ ...form, goalAmount: e.target.value })} />
          </Field>
          <Field label="Ahorro mensual objetivo (S/)">
            <input className={inputClass} inputMode="decimal" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} />
          </Field>
          <Field label="Enlace">
            <input className={inputClass} placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </Field>
          <Field label="Imagen de la meta">
            <input className="block w-full text-[14px] text-[var(--fnz-muted)]" type="file" accept="image/*" onChange={onImage} />
          </Field>
          {form.image && (
            <img src={form.image} alt="" className="h-20 w-20 rounded-2xl object-cover sm:col-span-2" />
          )}
          {error && <p className="text-[14px] text-[var(--fnz-danger)] sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>
              {editingId ? 'Guardar meta' : 'Agregar meta'}
            </button>
            {editingId && (
              <button type="button" onClick={closeForm} className="rounded-full px-5 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </AddFormPanel>

      <ul className="space-y-3">
        {items.map((item) => {
          const pct = item.goalAmount ? (item.amount / item.goalAmount) * 100 : 0
          return (
            <li key={item.id} className={card}>
              <div className="flex gap-4">
                {item.image && (
                  <img src={item.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => openHistory(item)} className="text-left">
                      <p className="text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                    </button>
                    <RowMenu onEdit={() => startEdit(item)} onDelete={() => removeAhorro(item.id)} />
                  </div>
                  <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--fnz-accent)]">
                    {formatSoles(item.amount)}
                    {item.goalAmount ? (
                      <span className="text-[15px] font-medium text-[var(--fnz-muted)]"> de {formatSoles(item.goalAmount)}</span>
                    ) : null}
                  </p>
                  {item.monthlyTarget > 0 && (
                    <p className="text-[13px] text-[var(--fnz-muted)]">Objetivo mensual: {formatSoles(item.monthlyTarget)}</p>
                  )}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className={btnText}>
                      Abrir enlace
                    </a>
                  )}
                  {item.goalAmount > 0 && (
                    <div className="mt-3">
                      <ProgressBar value={pct} label="Avance de la meta" />
                    </div>
                  )}
                  <div className="mt-3">
                    <button type="button" onClick={() => openDeposit(item)} className={btnText}>
                      + Agregar dinero
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
        {!items.length && <p className={empty}>No hay metas de ahorro todavía.</p>}
      </ul>

      {depositOpen && depositAhorroId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <h2 className="text-center text-[22px] font-semibold text-[var(--fnz-text)]">Agregar dinero</h2>
            <p className="mt-2 text-center text-[15px] text-[var(--fnz-muted)]">
              Sumar monto a la meta de ahorro.
            </p>
            <form onSubmit={submitDeposit} className="mt-5 space-y-3">
              <Field label="Monto (S/)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="De donde es el dinero">
                <input
                  className={inputClass}
                  value={depositForm.source}
                  onChange={(e) => setDepositForm({ ...depositForm, source: e.target.value })}
                  placeholder="Ej: sueldo, venta, regalo..."
                />
              </Field>
              <div className="flex flex-col gap-2 pt-2">
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Guardar
                </button>
                <button type="button" onClick={closeDeposit} className={`${btnText} w-full`}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyAhorroId && historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold text-[var(--fnz-text)]">Historial</h2>
                <p className="text-[15px] text-[var(--fnz-muted)]">{historyItem.name}</p>
              </div>
              <button type="button" onClick={closeHistory} className={btnText}>
                Cerrar
              </button>
            </div>
            <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2">
              {(historyItem.history || []).length === 0 && (
                <p className="text-[15px] text-[var(--fnz-muted)]">Sin movimientos registrados.</p>
              )}
              {(historyItem.history || []).map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-[var(--fnz-input)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-[var(--fnz-text)]">+{formatSoles(entry.amount)}</p>
                    <p className="text-[13px] text-[var(--fnz-muted)]">{formatDate(entry.date)}</p>
                  </div>
                  {entry.source && (
                    <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">{entry.source}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
