import { useMemo, useState } from 'react'
import { btnPrimary, btnSecondary, btnText } from './ui'

function ModalShell({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        {children}
      </div>
    </div>
  )
}

export function UserPicker({ users, selectedIds, onToggle, emptyText }) {
  if (!users.length) {
    return <p className="mt-4 text-[15px] leading-relaxed text-[var(--fnz-muted)]">{emptyText}</p>
  }

  return (
    <ul className="mt-4 max-h-[40vh] space-y-1 overflow-y-auto">
      {users.map((user) => {
        const checked = selectedIds.includes(user.id)
        return (
          <li key={user.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[var(--fnz-input)]">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(user.id)}
                className="h-4 w-4 accent-[var(--fnz-accent)]"
              />
              <span className="text-[16px] font-medium text-[var(--fnz-text)]">{user.username}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export default function ShareGoalModal({ name, users, onPersonal, onShared }) {
  const [step, setStep] = useState('type')
  const [selectedIds, setSelectedIds] = useState([])

  function toggle(id) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function confirmShared() {
    const selected = users.filter((user) => selectedIds.includes(user.id))
    onShared(selected)
  }

  if (step === 'type') {
    return (
      <ModalShell>
        <h2 className="text-center text-[22px] font-semibold text-[var(--fnz-text)]">Tipo de meta</h2>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          ¿<span className="font-semibold text-[var(--fnz-text)]">{name}</span> es personal o compartida?
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={onPersonal} className={`${btnPrimary} w-full`}>
            Personal
          </button>
          <button
            type="button"
            onClick={() => setStep('members')}
            className={`${btnSecondary} w-full`}
          >
            Compartida
          </button>
        </div>
        <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--fnz-muted)]">
          Personal: solo tú. Compartida: puedes agregar a otras personas; todos ven el mismo ahorro y
          pueden sumar dinero.
        </p>
      </ModalShell>
    )
  }

  return (
    <ModalShell>
      <h2 className="text-center text-[22px] font-semibold text-[var(--fnz-text)]">Agregar personas</h2>
      <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
        Elige quiénes verán y alimentarán esta meta. Puedes agregar más después.
      </p>
      <UserPicker
        users={users}
        selectedIds={selectedIds}
        onToggle={toggle}
        emptyText="Aún no hay otras cuentas. Cuando existan más usuarios, podrás agregarlas a esta meta."
      />
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" onClick={confirmShared} className={`${btnPrimary} w-full`}>
          {selectedIds.length ? 'Crear meta compartida' : 'Crear sin agregar ahora'}
        </button>
        <button type="button" onClick={onPersonal} className={`${btnText} w-full`}>
          Mejor personal
        </button>
      </div>
    </ModalShell>
  )
}

export function AddMembersModal({ name, users, onAdd, onClose }) {
  const [selectedIds, setSelectedIds] = useState([])
  const selected = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [selectedIds, users],
  )

  function toggle(id) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <ModalShell>
      <h2 className="text-center text-[22px] font-semibold text-[var(--fnz-text)]">Agregar a la meta</h2>
      <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
        Personas para <span className="font-semibold text-[var(--fnz-text)]">{name}</span>. Verán el
        mismo monto y podrán agregar dinero.
      </p>
      <UserPicker
        users={users}
        selectedIds={selectedIds}
        onToggle={toggle}
        emptyText="No hay más usuarios disponibles para agregar."
      />
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => onAdd(selected)}
          className={`${btnPrimary} w-full disabled:opacity-50`}
        >
          Agregar
        </button>
        <button type="button" onClick={onClose} className={`${btnText} w-full`}>
          Cancelar
        </button>
      </div>
    </ModalShell>
  )
}
