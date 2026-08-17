import { THEMES } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { card, PageHeader } from '../components/ui'

export default function AjustesPage() {
  const { theme, setTheme } = useTheme()

  return (
    <section className="space-y-5">
      <PageHeader
        title="Ajustes"
        subtitle="Cambia la temática de Finanzas. El resto de tus datos se queda igual."
      />

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
