import { useEffect, useState } from 'react'
import AddFormPanel from '../components/AddFormPanel'
import Field, { inputClass } from '../components/Field'
import ProgressBar from '../components/ProgressBar'
import RowMenu from '../components/RowMenu'
import ShareGoalModal, { AddMembersModal, UserPicker } from '../components/ShareGoalModal'
import { btnDanger, btnPrimary, btnSecondary, btnText, card, empty, PageHeader } from '../components/ui'
import { useFinanzas } from '../context/FinanzasContext'
import { formatDate } from '../lib/dates'
import { formatSoles, parseAmount } from '../lib/money'
import { isAhorroOwner, isSharedAhorro, memberLabel, samePerson } from '../lib/sharedAhorro'

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
  const {
    account,
    addAhorro,
    updateAhorro,
    addAhorroDeposit,
    removeAhorroDeposit,
    removeAhorro,
    shareAhorro,
    addAhorroMembers,
    removeAhorroMember,
    listDirectory,
    refreshAccount,
  } = useFinanzas()
  const items = account.data.ahorros
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')

  const [depositAhorroId, setDepositAhorroId] = useState(null)
  const [depositForm, setDepositForm] = useState(emptyDepositForm)
  const [depositOpen, setDepositOpen] = useState(false)

  const [historyAhorroId, setHistoryAhorroId] = useState(null)
  const [confirmDepositId, setConfirmDepositId] = useState(null)

  const [sharePrompt, setSharePrompt] = useState(null)
  const [addMembersFor, setAddMembersFor] = useState(null)
  const [directory, setDirectory] = useState([])
  const [createType, setCreateType] = useState(null)
  const [pendingMembers, setPendingMembers] = useState([])
  const [memberStep, setMemberStep] = useState(false)

  useEffect(() => {
    refreshAccount()
    listDirectory()
      .then(setDirectory)
      .catch(() => setDirectory([]))

    function onVisible() {
      if (document.visibilityState === 'visible') refreshAccount()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [listDirectory, refreshAccount])

  useEffect(() => {
    const timer = setInterval(() => {
      if (formOpen || depositOpen || sharePrompt || addMembersFor || historyAhorroId) return
      refreshAccount()
    }, 8000)
    return () => clearInterval(timer)
  }, [addMembersFor, depositOpen, formOpen, historyAhorroId, refreshAccount, sharePrompt])

  const otherUsers = directory.filter((user) => !samePerson(user, account))

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setCreateType(null)
    setPendingMembers([])
    setMemberStep(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setCreateType(null)
    setPendingMembers([])
    setMemberStep(false)
    setFormOpen(true)
  }

  function togglePendingMember(id) {
    setPendingMembers((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
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
      closeForm()
      return
    }
    addAhorro({
      ...payload,
      shared: createType === 'shared',
      members: otherUsers.filter((user) => pendingMembers.includes(user.id)),
    })
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
    setConfirmDepositId(null)
  }

  function removeDeposit(entry) {
    if (!historyAhorroId || !entry?.id) return
    removeAhorroDeposit(historyAhorroId, entry.id)
    setConfirmDepositId(null)
  }

  const historyItem = historyAhorroId ? items.find((item) => item.id === historyAhorroId) : null
  const addMembersItem = addMembersFor ? items.find((item) => item.id === addMembersFor) : null
  const inviteCandidates = addMembersItem
    ? otherUsers.filter(
        (user) => !(addMembersItem.members || []).some((member) => samePerson(member, user)),
      )
    : otherUsers

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
        addLabel={
          createType === 'shared'
            ? 'Nueva meta compartida'
            : createType === 'personal'
              ? 'Nueva meta personal'
              : 'Agregar meta'
        }
        editLabel="Editar meta"
        onOpen={openCreate}
        onClose={closeForm}
      >
        {!editingId && !createType ? (
          <div className="space-y-3">
            <p className="text-[15px] leading-relaxed text-[var(--fnz-muted)]">
              Primero elige si esta meta es solo tuya o si otras personas también podrán verla y
              agregar dinero.
            </p>
            <button
              type="button"
              onClick={() => {
                setCreateType('personal')
                setMemberStep(false)
              }}
              className={`${btnPrimary} w-full`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateType('shared')
                setMemberStep(true)
              }}
              className={`${btnSecondary} w-full`}
            >
              Compartida
            </button>
            <p className="text-[13px] leading-relaxed text-[var(--fnz-muted)]">
              Personal: solo tú. Compartida: puedes agregar a otras cuentas; todas ven el mismo
              ahorro.
            </p>
          </div>
        ) : !editingId && createType === 'shared' && memberStep ? (
          <div>
            <p className="text-[15px] leading-relaxed text-[var(--fnz-muted)]">
              Elige quiénes verán y alimentarán esta meta. Puedes agregar más después.
            </p>
            <UserPicker
              users={otherUsers}
              selectedIds={pendingMembers}
              onToggle={togglePendingMember}
              emptyText="Aún no hay otras cuentas. Puedes crear la meta compartida ahora y agregar personas después."
            />
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => setMemberStep(false)} className={`${btnPrimary} w-full`}>
                {pendingMembers.length ? 'Continuar' : 'Continuar sin agregar ahora'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateType(null)
                  setPendingMembers([])
                  setMemberStep(false)
                }}
                className={`${btnText} w-full`}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {!editingId && createType === 'shared' ? (
            <p className="text-[14px] text-[var(--fnz-muted)] sm:col-span-2">
              {pendingMembers.length
                ? `Compartida con ${otherUsers
                    .filter((user) => pendingMembers.includes(user.id))
                    .map((user) => user.username)
                    .join(', ')}.`
                : 'Meta compartida. Podrás agregar personas después.'}
            </p>
          ) : null}
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
        )}
      </AddFormPanel>

      <ul className="space-y-3">
        {items.map((item) => {
          const goalAmount = Number(item.goalAmount) || 0
          const saved = Number(item.amount) || 0
          const pct = goalAmount > 0 ? (saved / goalAmount) * 100 : 0
          const shared = isSharedAhorro(item)
          const owner = isAhorroOwner(item, account)
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
                    <RowMenu
                      onEdit={() => startEdit(item)}
                      onDelete={owner ? () => removeAhorro(item.id) : undefined}
                    />
                  </div>
                  {shared ? (
                    <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">
                      <span className="rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 font-semibold text-[var(--fnz-accent)]">
                        Compartida
                      </span>
                      <span className="ml-2">{memberLabel(item)}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">Personal</p>
                  )}
                  <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--fnz-accent)]">
                    {formatSoles(saved)}
                    {goalAmount ? (
                      <span className="text-[15px] font-medium text-[var(--fnz-muted)]"> de {formatSoles(goalAmount)}</span>
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
                  {goalAmount > 0 && (
                    <div className="mt-3">
                      <ProgressBar value={pct} label="Avance de la meta" />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    <button type="button" onClick={() => openDeposit(item)} className={btnText}>
                      + Agregar dinero
                    </button>
                    {shared ? (
                      <button type="button" onClick={() => setAddMembersFor(item.id)} className={btnText}>
                        + Agregar persona
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSharePrompt({ id: item.id, name: item.name })}
                        className={btnText}
                      >
                        Hacer compartida
                      </button>
                    )}
                  </div>
                  {shared && owner && (item.members || []).length > 1 ? (
                    <ul className="mt-3 space-y-1">
                      {(item.members || [])
                        .filter((member) => member.id !== item.ownerId)
                        .map((member) => (
                          <li key={member.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="text-[var(--fnz-muted)]">{member.username}</span>
                            <button
                              type="button"
                              className={btnDanger}
                              onClick={() => removeAhorroMember(item.id, member.id)}
                            >
                              Quitar
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : null}
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
              {(historyItem.history || []).length > 0 && (
                <p className="text-[13px] text-[var(--fnz-muted)]">
                  Si te equivocaste de meta o de monto, puedes quitar el aporte. Se resta de esta meta.
                </p>
              )}
              {[...(historyItem.history || [])].slice().reverse().map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-[var(--fnz-input)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--fnz-text)]">+{formatSoles(entry.amount)}</p>
                      <p className="mt-0.5 text-[13px] text-[var(--fnz-muted)]">{formatDate(entry.date)}</p>
                      {entry.byUsername ? (
                        <p className="mt-1 text-[13px] font-medium text-[var(--fnz-text)]">{entry.byUsername}</p>
                      ) : null}
                      {entry.source ? (
                        <p className="mt-1 text-[13px] text-[var(--fnz-muted)]">{entry.source}</p>
                      ) : null}
                    </div>
                    {entry.id && confirmDepositId !== entry.id ? (
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => setConfirmDepositId(entry.id)}
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  {confirmDepositId === entry.id ? (
                    <div className="mt-3 border-t border-[var(--fnz-line)] pt-3">
                      <p className="text-[13px] text-[var(--fnz-muted)]">
                        ¿Quitar {formatSoles(entry.amount)} de esta meta?
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button type="button" className={btnDanger} onClick={() => removeDeposit(entry)}>
                          Sí, quitar
                        </button>
                        <button type="button" className={btnText} onClick={() => setConfirmDepositId(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {sharePrompt ? (
        <ShareGoalModal
          name={sharePrompt.name}
          users={otherUsers}
          onPersonal={() => setSharePrompt(null)}
          onShared={(users) => {
            shareAhorro(sharePrompt.id, users)
            setSharePrompt(null)
          }}
        />
      ) : null}

      {addMembersItem ? (
        <AddMembersModal
          name={addMembersItem.name}
          users={inviteCandidates}
          onAdd={(users) => {
            addAhorroMembers(addMembersItem.id, users)
            setAddMembersFor(null)
          }}
          onClose={() => setAddMembersFor(null)}
        />
      ) : null}
    </section>
  )
}
