import { useEffect, useState } from 'react'
import { THEMES } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useFinanzas } from '../context/FinanzasContext'
import { btnDanger, card, PageHeader } from '../components/ui'

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function UsersAdmin() {
  const { listUsers, deleteUser, account } = useFinanzas()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(err.message || 'No se pudo cargar la lista.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function confirmDelete() {
    if (!pending) return
    setBusy(true)
    const result = await deleteUser(pending.id)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      setPending(null)
      return
    }
    setPending(null)
    refresh()
  }

  return (
    <div className={card}>
      <h3 className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Usuarios</h3>
      <p className="mt-1 text-[14px] text-[var(--fnz-muted)]">
        Solo tú puedes ver y eliminar cuentas. El administrador no se puede borrar.
      </p>

      {loading ? (
        <p className="mt-4 text-[14px] text-[var(--fnz-muted)]">Cargando usuarios…</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--fnz-line)]">
          {users.map((user) => {
            const self = user.id === account?.id || user.username === account?.username
            return (
              <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-[var(--fnz-text)]">
                    {user.username}
                    {user.isAdmin ? (
                      <span className="ml-2 rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fnz-accent)]">
                        Admin
                      </span>
                    ) : null}
                    {self && !user.isAdmin ? (
                      <span className="ml-2 text-[12px] font-medium text-[var(--fnz-muted)]">tú</span>
                    ) : null}
                  </p>
                  <p className="text-[13px] text-[var(--fnz-muted)]">{formatDate(user.createdAt)}</p>
                </div>
                {user.isAdmin ? (
                  <span className="text-[13px] text-[var(--fnz-muted)]">Protegido</span>
                ) : (
                  <button type="button" className={btnDanger} onClick={() => setPending(user)}>
                    Eliminar
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error ? <p className="mt-3 text-[14px] text-[var(--fnz-danger)]">{error}</p> : null}

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-[var(--fnz-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <h4 className="text-center text-[20px] font-semibold text-[var(--fnz-text)]">¿Eliminar usuario?</h4>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--fnz-muted)]">
              Se borrará la cuenta <span className="font-semibold text-[var(--fnz-text)]">{pending.username}</span> y
              todos sus datos de finanzas. Esto no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className="inline-flex items-center justify-center rounded-full bg-[var(--fnz-danger)] px-5 py-2.5 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
                className="w-full rounded-full px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-muted)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function AjustesPage() {
  const { theme, setTheme } = useTheme()
  const { isAdmin } = useFinanzas()

  return (
    <section className="space-y-5">
      <PageHeader
        title="Ajustes"
        subtitle="Cambia la temática de Finanzas. El resto de tus datos se queda igual."
      />

      {isAdmin ? <UsersAdmin /> : null}

      <div className={card}>
        <h3 className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">Tema</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {THEMES.map((item) => {
            const active = theme === item.id
            const kitty = item.id === 'kitty'
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`overflow-hidden rounded-[22px] border-2 text-left transition ${
                  active ? 'border-[var(--fnz-accent)] shadow-[var(--fnz-shadow)]' : 'border-transparent bg-[var(--fnz-input)]'
                }`}
              >
                <div
                  className="relative flex h-28 items-center justify-center overflow-hidden"
                  style={{ background: '#f2f2f7' }}
                >
                  {kitty ? (
                    <img src="/finanzas/bow.png" alt="" className="h-16 object-contain" />
                  ) : (
                    <div className="mx-4 w-full rounded-2xl bg-white p-3 shadow-sm">
                      <div className="h-2 w-16 rounded-full bg-[#007AFF]/30" />
                      <div className="mt-3 h-8 rounded-xl bg-[#f2f2f7]" />
                    </div>
                  )}
                </div>
                <div className="bg-[var(--fnz-card)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[17px] font-semibold text-[var(--fnz-text)]">{item.name}</p>
                    {active && (
                      <span className="rounded-full bg-[var(--fnz-accent-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--fnz-accent)]">
                        En uso
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--fnz-muted)]">{item.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
