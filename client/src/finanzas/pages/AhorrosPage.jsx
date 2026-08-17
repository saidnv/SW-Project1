import { useState } from 'react'
import Field, { inputClass } from '../components/Field'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import { btnPrimary, btnText, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles, parseAmount } from '../lib/money'

const emptyForm = {
  name: '',
  amount: '',
  goalAmount: '',
  monthlyTarget: '',
  link: '',
  image: '',
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
  const { account, addAhorro, updateAhorro, removeAhorro } = useFinanzas()
  const items = account.data.ahorros
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

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
      setEditingId(null)
    } else {
      addAhorro(payload)
    }
    setForm(emptyForm)
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
  }

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

      <form onSubmit={submit} className={`${card} grid gap-3 sm:grid-cols-2`}>
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
        <div className="sm:col-span-2">
          <button type="submit" className={btnPrimary}>
            {editingId ? 'Guardar meta' : 'Agregar meta'}
          </button>
        </div>
      </form>

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
                    <p className="text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
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
                </div>
              </div>
            </li>
          )
        })}
        {!items.length && <p className={empty}>No hay metas de ahorro todavía.</p>}
      </ul>
    </section>
  )
}
