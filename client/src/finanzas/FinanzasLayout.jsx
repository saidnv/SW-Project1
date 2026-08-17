import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useFinanzas } from './context/FinanzasContext'
import { useTheme } from './context/ThemeContext'
import KabinPanel from './components/KabinPanel'
import MelodyGuide from './components/MelodyGuide'
import SurplusModal from './components/SurplusModal'
import AuthScreen from './pages/AuthScreen'

const NAV = [
  { to: '/finanzas', label: 'Resumen', end: true, section: 'resumen' },
  { to: '/finanzas/creditos', label: 'Líneas o créditos', section: 'creditos' },
  { to: '/finanzas/deudas', label: 'Deudas totales', section: 'deudas' },
  { to: '/finanzas/pagos', label: 'Pagos mensuales', section: 'pagos' },
  { to: '/finanzas/ingresos', label: 'Sueldo e ingresos', section: 'ingresos' },
  { to: '/finanzas/ahorros', label: 'Ahorros', section: 'ahorros' },
]

function sectionFromPath(pathname) {
  const found = NAV.find((item) => item.to !== '/finanzas' && pathname.startsWith(item.to))
  if (pathname.startsWith('/finanzas/ajustes')) return 'ajustes'
  return found?.section ?? 'resumen'
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

export default function FinanzasLayout() {
  const { loggedIn, account, logout } = useFinanzas()
  const { theme } = useTheme()
  const location = useLocation()
  const section = sectionFromPath(location.pathname)
  const initial = (account?.username || 'K').slice(0, 1).toUpperCase()
  const kitty = theme === 'kitty'

  if (!loggedIn) {
    return (
      <div className="finanzas-app px-4 py-10" data-theme={theme}>
        <div className="mx-auto mb-6 max-w-md">
          <Link to="/" className="text-[15px] font-medium text-[var(--fnz-accent)]">
            ← Share Window
          </Link>
        </div>
        <AuthScreen />
      </div>
    )
  }

  return (
    <div className="finanzas-app relative" data-theme={theme}>
      <SurplusModal />
      {kitty && (
        <img
          src="/finanzas/bow.png"
          alt=""
          className="pointer-events-none fixed top-5 right-8 z-0 h-10 w-10 object-contain opacity-90"
        />
      )}
      {kitty && <MelodyGuide />}
      <div
        className={`relative z-10 mx-auto grid max-w-6xl gap-6 px-4 py-8 ${
          kitty ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[240px_1fr_300px]'
        }`}
      >
        <aside className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--fnz-accent)] text-[17px] font-semibold text-white">
                {initial}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--fnz-accent)]">{kitty ? 'My Melody' : 'Kabin'}</p>
                <h1 className="text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">Finanzas</h1>
                <p className="text-[13px] text-[var(--fnz-muted)]">{account.username} · Soles (S/)</p>
              </div>
            </div>
            <Link
              to="/finanzas/ajustes"
              aria-label="Ajustes"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--fnz-card)] text-[var(--fnz-accent)] shadow-[var(--fnz-shadow)] transition hover:scale-105"
            >
              {kitty ? (
                <img src="/finanzas/bow.png" alt="" className="h-6 w-6 object-contain" />
              ) : (
                <SettingsIcon />
              )}
            </Link>
          </div>

          <nav className="overflow-hidden rounded-[22px] bg-[var(--fnz-card)] shadow-[var(--fnz-shadow)]">
            {NAV.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 text-[16px] ${index ? 'border-t border-[var(--fnz-line)]' : ''} ${
                    isActive
                      ? 'bg-[var(--fnz-accent-soft)] font-semibold text-[var(--fnz-accent)]'
                      : 'text-[var(--fnz-text)]'
                  }`
                }
              >
                {item.label}
                <span className="text-[18px] text-[var(--fnz-muted)]">›</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-col gap-3 px-1">
            <Link to="/finanzas/ajustes" className="text-[15px] font-medium text-[var(--fnz-accent)]">
              Ajustes y temas
            </Link>
            <Link to="/" className="text-[15px] font-medium text-[var(--fnz-accent)]">
              Ir a compartir pantalla
            </Link>
            <button type="button" onClick={logout} className="text-left text-[15px] font-medium text-[var(--fnz-danger)]">
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <Outlet />
        </main>

        {!kitty && <KabinPanel section={section} />}
      </div>
    </div>
  )
}
