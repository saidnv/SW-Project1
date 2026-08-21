import { useState } from 'react'
import { formatSoles, parseAmount } from '../lib/money'
import { loanOwed } from '../lib/prestamos'
import Field, { inputClass } from './Field'
import { btnPrimary, btnText } from './ui'

export default function LoanClaimModal({ loan, onClose, onConfirm }) {
  const owed = loanOwed(loan)
  const [mode, setMode] = useState('full')
  const [amount, setAmount] = useState(String(owed))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const pay = mode === 'full' ? owed : parseAmount(amount)
    if (pay <= 0) {
      setError('Indica un monto mayor a 0.')
      return
    }
    if (pay - owed > 0.009) {
      setError(`No puedes registrar más de ${formatSoles(owed)}.`)
      return
    }
    const result = onConfirm({ amount: pay, note })
    if (result && result.ok === false) {
      setError(result.error || 'No se pudo registrar el pago.')
      return
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      >
        <h4 className="text-center text-[20px] font-semibold text-[var(--fnz-text)]">Registrar un pago</h4>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          Debes {formatSoles(owed)} a {loan.lenderUsername}. {loan.lenderUsername} tiene que confirmar
          el pago para que se descuente.
        </p>
        <div className="mt-5 space-y-3">
          <label className="flex items-center gap-2 text-[15px] text-[var(--fnz-text)]">
            <input type="radio" checked={mode === 'full'} onChange={() => setMode('full')} />
            Ya pagué el total ({formatSoles(owed)})
          </label>
          <label className="flex items-center gap-2 text-[15px] text-[var(--fnz-text)]">
            <input
              type="radio"
              checked={mode === 'partial'}
              onChange={() => {
                setMode('partial')
                setAmount('')
              }}
            />
            Pago parcial
          </label>
          {mode === 'partial' ? (
            <Field label="Monto pagado (S/)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setError('')
                }}
              />
            </Field>
          ) : null}
          <Field label="Nota (opcional)">
            <input
              className={inputClass}
              placeholder="Yape, transferencia, efectivo..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-[13px] text-[var(--fnz-danger)]">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-2">
          <button type="submit" className={`${btnPrimary} w-full`}>
            Enviar a confirmación
          </button>
          <button type="button" onClick={onClose} className={`${btnText} w-full`}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
