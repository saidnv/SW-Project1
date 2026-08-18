import Field, { inputClass } from './Field'
import PlasticCard from './PlasticCard'
import { CARD_COLORS, DEFAULT_CARD_COLOR, ITEM_KINDS } from '../lib/kinds'

export const emptyKindForm = {
  kind: 'otros',
  name: '',
  amount: '',
  color: DEFAULT_CARD_COLOR,
}

export default function KindFields({ form, setForm, amountLabel = 'Monto (S/)' }) {
  const isTarjeta = form.kind === 'tarjeta'

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <select
            className={inputClass}
            value={form.kind}
            onChange={(event) => {
              const kind = event.target.value
              setForm({
                ...form,
                kind,
                color: kind === 'tarjeta' ? form.color || DEFAULT_CARD_COLOR : form.color,
              })
            }}
          >
            {ITEM_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={isTarjeta ? 'OH, BCP, Interbank…' : 'Nombre'}
          />
        </Field>
      </div>
      {isTarjeta ? (
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((color) => {
              const selected = form.color === color
              return (
                <button
                  key={color}
                  type="button"
                  aria-label="Color de tarjeta"
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full ${selected ? 'ring-2 ring-[var(--fnz-accent)] ring-offset-2' : ''}`}
                  style={{ background: color }}
                />
              )
            })}
          </div>
        </Field>
      ) : null}
      <Field label={amountLabel}>
        <input
          className={inputClass}
          inputMode="decimal"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
      </Field>
      {isTarjeta && form.name.trim() ? (
        <PlasticCard name={form.name.trim()} amount={form.amount ? Number(form.amount) || 0 : null} color={form.color} />
      ) : null}
    </div>
  )
}
