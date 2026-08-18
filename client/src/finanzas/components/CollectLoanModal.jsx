import { useState } from 'react'
import { formatSoles } from '../lib/money'
import { loanTotal } from '../lib/prestamos'
import Field, { inputClass } from './Field'
import { btnPrimary } from './ui'

export default function CollectLoanModal({ loan, onConfirm, onClose }) {
  const [collector, setCollector] = useState('')
  const [error, setError] = useState('')
  const total = loanTotal(loan)

  function submit(event) {
    event.preventDefault()
    const name = collector.trim()
    if (!name) {
      setError('Escribe el nombre de quien cobró.')
      return
    }
    onConfirm(name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      >
        <h4 className="text-center text-[20px] font-semibold text-[var(--fnz-text)]">¿Marcar como cobrado?</h4>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          {loan.name} devuelve <span className="font-semibold text-[var(--fnz-text)]">{formatSoles(total)}</span>.
          El capital vuelve al fondo y el interés lo aumenta.
        </p>
        <div className="mt-5">
          <Field label="Cobrador">
            <input
              className={inputClass}
              autoFocus
              placeholder="Quién cobró"
              value={collector}
              onChange={(event) => {
                setCollector(event.target.value)
                setError('')
              }}
            />
          </Field>
        </div>
        {error ? <p className="mt-2 text-[13px] text-[var(--fnz-danger)]">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-2">
          <button type="submit" className={`${btnPrimary} w-full`}>
            Confirmar cobro
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
