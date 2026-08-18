import { formatSoles } from '../lib/money'
import { isLoanCollected, loanInterestAmount, loanPoolDelta, loanTotal } from '../lib/prestamos'

export default function DeleteLoanModal({ loan, pool, nextPool, onConfirm, onClose }) {
  const collected = isLoanCollected(loan)
  const interest = loanInterestAmount(loan)
  const delta = loanPoolDelta(loan)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <h4 className="text-center text-[20px] font-semibold text-[var(--fnz-text)]">¿Eliminar préstamo?</h4>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          Se borrará el préstamo a <span className="font-semibold text-[var(--fnz-text)]">{loan.name}</span>
          {' '}({formatSoles(loanTotal(loan))}).
        </p>
        {collected && delta > 0 ? (
          <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--fnz-danger)]">
            El interés {formatSoles(interest)} se quita del fondo. Pasa de {formatSoles(pool)} a{' '}
            {formatSoles(nextPool)}.
          </p>
        ) : collected ? (
          <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
            Este cobro no sumó interés, así que el fondo se mantiene.
          </p>
        ) : (
          <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
            Como no está cobrado, no hay interés en el fondo que revertir.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-full bg-[var(--fnz-danger)] px-5 py-2.5 text-[15px] font-semibold text-white"
          >
            Sí, eliminar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
