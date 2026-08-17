import { btnPrimary, btnText, card } from './ui'

export default function AddFormPanel({ open, editing, addLabel, editLabel, onOpen, onClose, children }) {
  if (!open) {
    return (
      <button type="button" onClick={onOpen} className={`${btnPrimary} w-full`}>
        + {addLabel}
      </button>
    )
  }

  return (
    <div className={card}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[16px] font-semibold text-[var(--fnz-text)]">{editing ? editLabel : addLabel}</p>
        {!editing && (
          <button type="button" onClick={onClose} className={btnText}>
            Cancelar
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
