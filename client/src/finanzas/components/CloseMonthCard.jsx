import { useState } from 'react'
import { formatMonthKey, isMonthCloseWindow } from '../lib/dates'
import { btnPrimary, card } from './ui'

export default function CloseMonthCard({ periodKey, ready, onCloseMonth }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ready || !isMonthCloseWindow(periodKey)) return null

  async function confirmClose() {
    setBusy(true)
    setError('')
    const result = await onCloseMonth()
    setBusy(false)
    if (result?.waitingSurplus) {
      setConfirm(false)
      return
    }
    if (!result?.ok) {
      setError(result?.error || 'No se pudo cerrar el mes.')
      return
    }
    setConfirm(false)
  }

  return (
    <>
      <div className={`${card} flex items-center justify-between gap-3 py-4`}>
        <p className="text-[16px] font-semibold capitalize text-[var(--fnz-text)]">{formatMonthKey(periodKey)}</p>
        <button type="button" onClick={() => setConfirm(true)} className={`${btnPrimary} shrink-0 px-5`}>
          Cerrar mes
        </button>
      </div>
      {error ? <p className="-mt-2 px-1 text-[13px] text-[var(--fnz-danger)]">{error}</p> : null}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <h4 className="text-center text-[20px] font-semibold text-[var(--fnz-text)]">¿Cerrar {formatMonthKey(periodKey)}?</h4>
            <div className="mt-6 flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={confirmClose} className={`${btnPrimary} w-full disabled:opacity-60`}>
                {busy ? 'Cerrando…' : 'Cerrar mes'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
                className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
