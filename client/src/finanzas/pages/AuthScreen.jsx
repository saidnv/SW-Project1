import { useState } from 'react'
import { useFinanzas } from '../context/FinanzasContext'
import { MAX_ACCOUNTS } from '../lib/storage'
import Field, { inputClass } from '../components/Field'
import { btnPrimary, card } from '../components/ui'

export default function AuthScreen() {
  const { accounts, createAccount, login, usingApi } = useFinanzas()
  const [mode, setMode] = useState(accounts.length ? 'login' : 'create')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const result = await createAccount(username, pin)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const identity = usingApi ? username : accountId
    const result = await login(identity, pin)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className={`mx-auto w-full max-w-md ${card}`}>
      <p className="text-[13px] font-medium text-[var(--fnz-accent)]">Kabin</p>
      <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[var(--fnz-text)]">Finanzas personales</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--fnz-muted)]">
        Entra con un nombre y un PIN de 4 dígitos. Máximo {MAX_ACCOUNTS} cuentas. Los montos se
        manejan en soles peruanos (S/).
        {usingApi
          ? ' Tus datos se guardan en la nube y los verás en cualquier dispositivo.'
          : ' Ahora mismo se guardan en este navegador porque la API no está conectada.'}
      </p>

      <div className="mt-5 grid grid-cols-2 rounded-full bg-[var(--fnz-input)] p-1">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError('')
          }}
          className={`rounded-full px-3 py-2 text-[14px] font-medium ${mode === 'login' ? 'bg-[var(--fnz-card)] text-[var(--fnz-text)] shadow-sm' : 'text-[var(--fnz-muted)]'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('create')
            setError('')
          }}
          disabled={!usingApi && accounts.length >= MAX_ACCOUNTS}
          className={`rounded-full px-3 py-2 text-[14px] font-medium disabled:opacity-40 ${mode === 'create' ? 'bg-[var(--fnz-card)] text-[var(--fnz-text)] shadow-sm' : 'text-[var(--fnz-muted)]'}`}
        >
          Crear cuenta
        </button>
      </div>

      {mode === 'login' ? (
        <form className="mt-5 space-y-4" onSubmit={handleLogin}>
          {!usingApi && accounts.length === 0 ? (
            <p className="text-[15px] text-[var(--fnz-muted)]">Aún no hay cuentas. Crea la primera.</p>
          ) : (
            <>
              {usingApi ? (
                <Field label="Nombre de usuario">
                  <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
                </Field>
              ) : (
                <Field label="Cuenta">
                  <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.username}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="PIN de 4 dígitos">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </Field>
              <button type="submit" disabled={busy} className={`${btnPrimary} w-full disabled:opacity-60`}>
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
            </>
          )}
        </form>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleCreate}>
          <Field label="Nombre de usuario">
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="PIN de 4 dígitos">
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </Field>
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full disabled:opacity-60`}>
            {busy ? 'Creando…' : 'Crear y entrar'}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-[14px] text-rose-600">{error}</p>
      )}

      <p className="mt-4 text-[12px] text-[var(--fnz-muted)]">
        {usingApi
          ? `Hasta ${MAX_ACCOUNTS} cuentas. El PIN viaja cifrado hacia el servidor.`
          : `${accounts.length}/${MAX_ACCOUNTS} cuentas creadas. El PIN se guarda solo en este navegador.`}
      </p>
    </div>
  )
}
