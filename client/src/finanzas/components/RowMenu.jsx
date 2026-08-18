import { useEffect, useRef, useState } from 'react'

export default function RowMenu({ onEdit, onDelete, tone = 'default' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Más opciones"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          tone === 'light'
            ? 'text-white/80 hover:bg-white/15 hover:text-white'
            : 'text-[var(--fnz-muted)] hover:bg-[var(--fnz-input)] hover:text-[var(--fnz-text)]'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[140px] overflow-hidden rounded-2xl bg-[var(--fnz-card)] py-1 shadow-[var(--fnz-shadow)] ring-1 ring-black/5">
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-[15px] text-[var(--fnz-accent)] hover:bg-[var(--fnz-input)]"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-[15px] text-[var(--fnz-danger)] hover:bg-[var(--fnz-input)]"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
