import { useEffect, useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import CollectLoanModal from '../components/CollectLoanModal'
import DeleteLoanModal from '../components/DeleteLoanModal'
import Field, { inputClass } from '../components/Field'
import IosDateField from '../components/IosDateField'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import { btnDanger, btnPrimary, btnSecondary, btnText, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatDate, formatDay, todayInputValue } from '../lib/dates'
import { formatSoles, parseAmount } from '../lib/money'
import { samePerson } from '../lib/sharedAhorro'
import { isLinkedLoan, isLoanCollected, loanDueState, loanInterestAmount, loanOwed, loanPaidAmount, loanTotal, pendingLoanClaim, poolAfterRemovingLoan, remainingToLend } from '../lib/prestamos'

const emptyForm = {
  name: '',
  amount: '',
  interest: '',
  dueDate: '',
  notes: '',
  image: '',
  linkKind: 'external',
  borrowerId: '',
}

const textareaClass = `${inputClass} min-h-[92px] resize-y`

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

function dueBadgeClass(key) {
  if (key === 'collected') return 'bg-emerald-50 text-[var(--fnz-success)]'
  if (key === 'overdue' || key === 'today') return 'bg-rose-50 text-[var(--fnz-danger)]'
  if (key === 'tomorrow') return 'bg-amber-50 text-[var(--fnz-warn)]'
  return 'bg-[var(--fnz-input)] text-[var(--fnz-muted)]'
}

export default function PrestamosPage() {
  const {
    account,
    addPrestamo,
    updatePrestamo,
    removePrestamo,
    collectPrestamo,
    reviewLoanClaim,
    setPrestamoDisponible,
    listDirectory,
    refreshAccount,
  } = useFinanzas()
  const items = account.data.prestamos || []
  const pool = Number(account.data.prestamoDisponible) || 0
  const leftover = remainingToLend(pool, items)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [poolOpen, setPoolOpen] = useState(false)
  const [poolAmount, setPoolAmount] = useState(pool ? String(pool) : '')
  const [error, setError] = useState('')
  const [collecting, setCollecting] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [directory, setDirectory] = useState([])

  useEffect(() => {
    listDirectory()
      .then(setDirectory)
      .catch(() => setDirectory([]))
    refreshAccount()
    function onVisible() {
      if (document.visibilityState === 'visible') refreshAccount()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [listDirectory, refreshAccount])

  const otherUsers = directory.filter((user) => !samePerson(user, account))

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  function closePool() {
    setPoolOpen(false)
    setPoolAmount(pool ? String(pool) : '')
  }

  function submit(event) {
    event.preventDefault()
    setError('')
    const linked = !editingId && form.linkKind === 'user'
    const borrower = linked ? otherUsers.find((user) => user.id === form.borrowerId) : null
    const name = linked ? borrower?.username || '' : form.name.trim()
    const amount = parseAmount(form.amount)
    const interest = parseAmount(form.interest)
    const dueDate = form.dueDate
    if (linked && !borrower) {
      setError('Selecciona un usuario del sistema.')
      return
    }
    if (!name || amount <= 0 || !dueDate) {
      setError('Completa el nombre, el monto y la fecha de vencimiento.')
      return
    }
    const current = editingId ? items.find((item) => item.id === editingId) : null
    const currentAmount = current && !isLoanCollected(current) ? current.amount || 0 : 0
    const nextLeftover = leftover + currentAmount - amount
    if (pool > 0 && nextLeftover < 0) {
      setError(`Solo te quedan ${formatSoles(leftover + currentAmount)} para prestar.`)
      return
    }
    const payload = {
      name,
      amount,
      interest,
      dueDate,
      notes: form.notes.trim(),
      image: form.image,
    }
    if (editingId) updatePrestamo(editingId, payload)
    else addPrestamo({ ...payload, linked, borrower })
    closeForm()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      amount: String(item.amount),
      interest: item.interest ? String(item.interest) : '',
      dueDate: item.dueDate || '',
      notes: item.notes || '',
      image: item.image || '',
      linkKind: isLinkedLoan(item) ? 'user' : 'external',
      borrowerId: item.borrowerId || '',
    })
    setFormOpen(true)
    setPoolOpen(false)
  }

  function submitPool(event) {
    event.preventDefault()
    setPrestamoDisponible(parseAmount(poolAmount))
    setPoolOpen(false)
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
        title="Préstamos"
        subtitle="Dinero que prestas. Si vinculas a un usuario del sistema, esa persona lo verá en Pagos hasta que confirmes el cobro."
      />

      <div className="grid grid-cols-2 gap-2">
        <div className={card}>
          <p className="text-[12px] text-[var(--fnz-muted)]">Fondo para prestar</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--fnz-text)]">{formatSoles(pool)}</p>
          <p className="mt-1 text-[12px] text-[var(--fnz-muted)]">Sube con el interés al cobrar</p>
        </div>
        <div className={card}>
          <p className="text-[12px] text-[var(--fnz-muted)]">Disponible ahora</p>
          <p
            className={`mt-1 text-[22px] font-bold tabular-nums ${
              pool <= 0
                ? 'text-[var(--fnz-muted)]'
                : leftover >= 0
                  ? 'text-[var(--fnz-success)]'
                  : 'text-[var(--fnz-danger)]'
            }`}
          >
            {pool <= 0 ? 'Sin definir' : formatSoles(leftover)}
          </p>
        </div>
      </div>

      {!formOpen && !poolOpen && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFormOpen(true)
              setPoolOpen(false)
            }}
            className={`${btnPrimary} w-full`}
          >
            + Crear préstamo
          </button>
          <button
            type="button"
            onClick={() => {
              setPoolOpen(true)
              setFormOpen(false)
              setPoolAmount(pool ? String(pool) : '')
            }}
            className={`${btnSecondary} w-full`}
          >
            Definir dinero para prestar
          </button>
        </div>
      )}

      {poolOpen && (
        <div className={card}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[16px] font-semibold text-[var(--fnz-text)]">Dinero disponible para prestar</p>
            <button type="button" onClick={closePool} className="text-[15px] font-medium text-[var(--fnz-accent)]">
              Cancelar
            </button>
          </div>
          <form onSubmit={submitPool} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Monto apartado (S/)">
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder="0.00"
                value={poolAmount}
                onChange={(e) => setPoolAmount(e.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <button type="submit" className={`${btnPrimary} w-full`}>
                Guardar fondo
              </button>
            </div>
          </form>
          <p className="mt-3 text-[13px] text-[var(--fnz-muted)]">
            Este monto no se mezcla con ahorros. Al crear un préstamo se descuenta de lo que te queda disponible.
          </p>
        </div>
      )}

      {formOpen && (
        <AddFormPanel
          open
          editing={Boolean(editingId)}
          addLabel="Crear préstamo"
          editLabel="Editar préstamo"
          onOpen={() => setFormOpen(true)}
          onClose={closeForm}
        >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {!editingId ? (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-[13px] font-medium text-[var(--fnz-muted)]">¿A quién le prestas?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, linkKind: 'external', borrowerId: '' })}
                  className={form.linkKind === 'external' ? btnPrimary : btnSecondary}
                >
                  Persona externa
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, linkKind: 'user', name: '' })}
                  className={form.linkKind === 'user' ? btnPrimary : btnSecondary}
                >
                  Usuario del sistema
                </button>
              </div>
              <p className="text-[13px] text-[var(--fnz-muted)]">
                Si es un usuario de aquí, verá la deuda en Pagos y tú confirmarás cuando pague.
              </p>
            </div>
          ) : null}
          {form.linkKind === 'user' && !editingId ? (
            <div className="sm:col-span-2">
              <Field label="Usuario">
                <select
                  className={inputClass}
                  value={form.borrowerId}
                  onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
                >
                  <option value="">Selecciona un usuario</option>
                  {otherUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </Field>
              {!otherUsers.length ? (
                <p className="mt-2 text-[13px] text-[var(--fnz-muted)]">No hay otras cuentas para vincular.</p>
              ) : null}
            </div>
          ) : (
            <Field label="Nombre a quien se le presta">
              <input
                className={inputClass}
                placeholder="Nombre de la persona"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={Boolean(editingId && form.linkKind === 'user')}
              />
            </Field>
          )}
          <Field label="Monto (S/)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Interés (%)">
            <input
              className={inputClass}
              inputMode="decimal"
              placeholder="0"
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
            />
          </Field>
          <Field label="Hasta qué fecha">
            <IosDateField
              value={form.dueDate}
              min={editingId ? undefined : todayInputValue()}
              onChange={(dueDate) => setForm({ ...form, dueDate })}
            />
          </Field>
          <Field label="Foto o constancia de préstamo">
            <input className="block w-full text-[14px] text-[var(--fnz-muted)]" type="file" accept="image/*" onChange={onImage} />
          </Field>
          {form.image ? (
            <div className="flex items-end gap-3">
              <img src={form.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              <button
                type="button"
                className="text-[14px] font-medium text-[var(--fnz-danger)]"
                onClick={() => setForm({ ...form, image: '' })}
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          <div className="sm:col-span-2">
            <Field label="Notas adicionales">
              <textarea
                className={textareaClass}
                placeholder="Acuerdos, forma de pago, etc."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          {error && <p className="text-[14px] text-[var(--fnz-danger)] sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>
              {editingId ? 'Guardar préstamo' : 'Crear préstamo'}
            </button>
            {editingId && (
              <button type="button" onClick={closeForm} className="rounded-full px-5 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]">
                Cancelar
              </button>
            )}
          </div>
        </form>
        </AddFormPanel>
      )}

      <ul className="space-y-3">
        {[...items]
          .sort((a, b) => Number(isLoanCollected(a)) - Number(isLoanCollected(b)))
          .map((item) => {
          const collected = isLoanCollected(item)
          const due = loanDueState(item)
          const interest = loanInterestAmount(item)
          const linked = isLinkedLoan(item)
          const pending = pendingLoanClaim(item)
          const owed = loanOwed(item)
          const paid = loanPaidAmount(item)
          const total = loanTotal(item)
          const pct = total > 0 ? (paid / total) * 100 : 0
          return (
            <li key={item.id} className={card}>
              <div className="flex gap-4">
                {item.image && <img src={item.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dueBadgeClass(due.key)}`}>
                          {due.label}
                        </span>
                        {linked ? (
                          <span className="inline-flex rounded-full bg-[var(--fnz-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--fnz-accent)]">
                            Usuario · {item.borrowerUsername}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[var(--fnz-input)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--fnz-muted)]">
                            Externo
                          </span>
                        )}
                      </div>
                    </div>
                    <RowMenu onEdit={() => startEdit(item)} onDelete={() => setDeleting(item)} />
                  </div>
                  <p className="mt-2 text-[22px] font-bold tabular-nums text-[var(--fnz-accent)]">
                    {linked && !collected ? formatSoles(owed) : formatSoles(item.amount)}
                    {linked && !collected ? (
                      <span className="text-[15px] font-medium text-[var(--fnz-muted)]"> de {formatSoles(total)}</span>
                    ) : null}
                  </p>
                  <p className="text-[13px] text-[var(--fnz-muted)]">
                    Interés {item.interest || 0}%{interest > 0 ? ` (${formatSoles(interest)})` : ''} · A cobrar {formatSoles(item.collectedAmount || loanTotal(item))}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">Hasta el {formatDay(item.dueDate)}</p>
                  {linked && !collected && total > 0 ? (
                    <div className="mt-3">
                      <ProgressBar value={pct} label={`Pagado ${formatSoles(paid)}`} />
                    </div>
                  ) : null}
                  {collected ? (
                    <p className="mt-2 text-[14px] font-medium text-[var(--fnz-success)]">
                      Cobró {item.collector} · {formatDate(item.collectedAt)}
                    </p>
                  ) : null}
                  {item.notes ? <p className="mt-2 text-[14px] leading-relaxed text-[var(--fnz-text)]">{item.notes}</p> : null}
                  {pending && !collected ? (
                    <div className="mt-4 rounded-2xl bg-[var(--fnz-input)] p-3">
                      <p className="text-[14px] font-medium text-[var(--fnz-text)]">
                        {item.borrowerUsername} indicó un pago de {formatSoles(pending.amount)}.
                      </p>
                      {pending.note ? <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">{pending.note}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => reviewLoanClaim(item.id, pending.id, true)}
                        >
                          Confirmar pago
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() => reviewLoanClaim(item.id, pending.id, false)}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {!collected && !linked ? (
                    <button type="button" onClick={() => setCollecting(item)} className={`${btnPrimary} mt-4 w-full sm:w-auto`}>
                      Cobrado
                    </button>
                  ) : null}
                  {!collected && linked && !pending ? (
                    <button type="button" onClick={() => setCollecting(item)} className={`${btnText} mt-4`}>
                      Marcar cobrado sin aviso
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
        {!items.length && <p className={empty}>Aún no hay préstamos registrados.</p>}
      </ul>

      {collecting ? (
        <CollectLoanModal
          loan={collecting}
          onClose={() => setCollecting(null)}
          onConfirm={(collector) => {
            collectPrestamo(collecting.id, collector)
            setCollecting(null)
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteLoanModal
          loan={deleting}
          pool={pool}
          nextPool={poolAfterRemovingLoan(pool, deleting)}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            removePrestamo(deleting.id)
            setDeleting(null)
          }}
        />
      ) : null}
    </section>
  )
}
