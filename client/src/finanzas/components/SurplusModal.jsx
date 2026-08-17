import { useState } from 'react'
import { useFinanzas } from '../context/FinanzasContext'
import { formatSoles } from '../lib/money'
import Field, { inputClass } from './Field'
import { btnPrimary } from './ui'

export default function SurplusModal() {
  const { surplusPrompt, account, allocateSurplus, dismissSurplus } = useFinanzas()
  const [mode, setMode] = useState('existing')
  const [ahorroId, setAhorroId] = useState(account?.data.ahorros[0]?.id ?? '')
  const [newName, setNewName] = useState('Ahorro del mes')

  if (!surplusPrompt) return null

  const ahorros = account?.data.ahorros ?? []

  function handleSave() {
    if (mode === 'existing' && ahorros.length) {
      allocateSurplus(ahorroId || ahorros[0].id)
      return
    }
    allocateSurplus(null, newName.trim() || 'Ahorro del mes')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <h2 className="text-center text-[22px] font-semibold text-[var(--fnz-text)]">Hay un remanente</h2>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
          Después de restar los pagos del mes, te quedan{' '}
          <span className="font-semibold text-[var(--fnz-text)]">{formatSoles(surplusPrompt.remainder)}</span>.
          ¿Quieres ahorrarlo o no hacer nada?
        </p>

        {ahorros.length > 0 && (
          <div className="mt-5 space-y-2">
            <label className="flex items-center gap-2 text-[15px] text-[var(--fnz-text)]">
              <input
                type="radio"
                name="surplus"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
              />
              Sumar a una meta existente
            </label>
            {mode === 'existing' && (
              <select
                className={inputClass}
                value={ahorroId}
                onChange={(event) => setAhorroId(event.target.value)}
              >
                {ahorros.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatSoles(item.amount)})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-[15px] text-[var(--fnz-text)]">
            <input
              type="radio"
              name="surplus"
              checked={mode === 'new' || ahorros.length === 0}
              onChange={() => setMode('new')}
            />
            Crear una meta nueva
          </label>
          {(mode === 'new' || ahorros.length === 0) && (
            <Field label="Nombre del ahorro">
              <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Field>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={handleSave} className={`${btnPrimary} w-full`}>
            Ahorrar remanente
          </button>
          <button
            type="button"
            onClick={dismissSurplus}
            className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]"
          >
            No hacer nada
          </button>
        </div>
      </div>
    </div>
  )
}
