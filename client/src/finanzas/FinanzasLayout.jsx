import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useFinanzas } from './context/FinanzasContext'
import { useTheme } from './context/ThemeContext'
import KabinPanel from './components/KabinPanel'
import MelodyGuide from './components/MelodyGuide'
import SurplusModal from './components/SurplusModal'
import AuthScreen from './pages/AuthScreen'

const NAV = [
  { to: '/finanzas', label: 'Resumen', shortLabel: 'Resumen', end: true, section: 'resumen' },
  { to: '/finanzas/creditos', label: 'Líneas o créditos', shortLabel: 'Créditos', section: 'creditos' },
  { to: '/finanzas/deudas', label: 'Deudas totales', shortLabel: 'Deudas', section: 'deudas' },
  { to: '/finanzas/pagos', label: 'Pagos mensuales', shortLabel: 'Pagos', section: 'pagos' },
  { to: '/finanzas/ingresos', label: 'Sueldo e ingresos', shortLabel: 'Ingresos', section: 'ingresos' },
  { to: '/finanzas/ahorros', label: 'Ahorros', shortLabel: 'Ahorros', section: 'ahorros' },
  { to: '/finanzas/prestamos', label: 'Préstamos', shortLabel: 'Préstamos', section: 'prestamos' },
]

function sectionFromPath(pathname) {
  const found = NAV.find((item) => item.to !== '/finanzas' && pathname.startsWith(item.to))
  if (pathname.startsWith('/finanzas/ajustes')) return 'ajustes'
  return found?.section ?? 'resumen'
}

function NavIcon({ section }) {
  const common = {
    viewBox: '0 0 24 24',
    className: 'h-4 w-4 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (section === 'resumen') {
    return (
      <svg {...common}>
        <path d="M4 19V10M10 19V5M16 19v-6M22 19V8" />
      </svg>
    )
  }
  if (section === 'creditos') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2.2" />
        <path d="M3 10h18" />
      </svg>
    )
  }
  if (section === 'deudas') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M8.5 12h7" />
      </svg>
    )
  }
  if (section === 'pagos') {
    return (
      <svg {...common}>
        <path d="M7 4.5h10a2 2 0 0 1 2 2V18a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 18V6.5a2 2 0 0 1 2-2Z" />
        <path d="M9 10h6M9 13.5h4" />
      </svg>
    )
  }
  if (section === 'ingresos') {
    return (
      <svg {...common}>
        <path d="M12 16V7" />
        <path d="M8 10.5 12 6.5l4 4" />
        <path d="M5 18h14" />
      </svg>
    )
  }
  if (section === 'ahorros') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (section === 'prestamos') {
    return (
      <svg {...common}>
        <circle cx="8" cy="12" r="2.4" />
        <path d="M4.2 17.2c.8-1.8 2.2-2.7 3.8-2.7s3 .9 3.8 2.7" />
        <path d="M14 10h6.2" />
        <path d="M17.8 7.2 21 10l-3.2 2.8" />
      </svg>
    )
  }
  return null
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

function AppBrand({ initial, kitty, account }) {
  const username = account.username || 'Usuario'

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--fnz-avatar-from)] to-[var(--fnz-avatar-to)] text-[18px] font-bold text-white shadow-[var(--fnz-btn-shadow)] lg:h-12 lg:w-12 lg:text-[19px]">
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[20px] font-bold leading-tight tracking-tight text-[var(--fnz-text)] lg:text-[22px]">
          {username}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--fnz-muted)] lg:text-[14px]">
          Finanzas · Soles (S/)
        </p>
        {kitty ? (
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--fnz-accent)] lg:text-[13px]">
            My Melody · tu guía
          </p>
        ) : (
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--fnz-accent)] lg:text-[13px]">
            Kabin · tu guía
          </p>
        )}
      </div>
    </div>
  )
}

function SidebarNav({ items }) {
  return (
    <nav className="overflow-hidden rounded-[22px] bg-[var(--fnz-card)] shadow-[var(--fnz-shadow)]">
      {items.map((item, index) => (
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
          <span className="flex min-w-0 items-center gap-2.5">
            <NavIcon section={item.section} />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="text-[18px] text-[var(--fnz-muted)]">›</span>
        </NavLink>
      ))}
    </nav>
  )
}

function MobileNav({ items }) {
  return (
    <nav className="fnz-scroll-x flex gap-2 pb-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium whitespace-nowrap transition ${
              isActive
                ? 'bg-[var(--fnz-accent)] text-white shadow-[var(--fnz-btn-shadow)]'
                : 'bg-[var(--fnz-card)] text-[var(--fnz-text)] shadow-[var(--fnz-shadow)]'
            }`
          }
        >
          <NavIcon section={item.section} />
          {item.shortLabel}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileMenu({ kitty, onClose, onLogout }) {
  return (
    <>
      <button
        type="button"
        aria-label="Cerrar menú"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <div className="fixed top-[4.5rem] right-3 z-50 min-w-[220px] overflow-hidden rounded-[18px] bg-[var(--fnz-card)] py-2 shadow-[var(--fnz-shadow)]">
        <Link
          to="/finanzas/ajustes"
          onClick={onClose}
          className="block px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-accent)]"
        >
          Ajustes y temas
        </Link>
        <Link to="/" onClick={onClose} className="block px-4 py-2.5 text-[15px] font-medium text-[var(--fnz-accent)]">
          Volver al inicio
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose()
            onLogout()
          }}
          className="block w-full px-4 py-2.5 text-left text-[15px] font-medium text-[var(--fnz-danger)]"
        >
          Cerrar sesión
        </button>
        {kitty ? (
          <div className="border-t border-[var(--fnz-line)] px-4 py-2 text-[12px] text-[var(--fnz-muted)]">
            My Melody te guía desde la esquina inferior.
          </div>
        ) : (
          <div className="border-t border-[var(--fnz-line)] px-4 py-2 text-[12px] text-[var(--fnz-muted)]">
            Kabin está disponible en pantallas grandes.
          </div>
        )}
      </div>
    </>
  )
}

export default function FinanzasLayout() {
  const { loggedIn, account, logout, ready, isSectionVisible } = useFinanzas()
  const { theme } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const section = sectionFromPath(location.pathname)
  const navItems = NAV.filter((item) => item.section === 'resumen' || isSectionVisible(item.section))
  const initial = (account?.username || 'K').slice(0, 1).toUpperCase()
  const kitty = theme === 'kitty'

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const titles = {
      resumen: 'Resumen',
      creditos: 'Créditos',
      deudas: 'Deudas',
      pagos: 'Pagos',
      ingresos: 'Ingresos',
      ahorros: 'Ahorros',
      prestamos: 'Préstamos',
      ajustes: 'Ajustes',
    }
    const previousTitle = document.title
    const icon = document.querySelector('link[rel="icon"]')
    const previousIcon = icon?.getAttribute('href')
    document.title = `${titles[section] || 'Finanzas'} · Finanzas`
    icon?.setAttribute('href', '/finanzas/favicon.svg')
    return () => {
      document.title = previousTitle
      if (icon && previousIcon) icon.setAttribute('href', previousIcon)
    }
  }, [section])

  if (!ready) {
    return (
      <div className="finanzas-app grid min-h-svh place-items-center px-4" data-theme={theme}>
        <p className="text-[15px] text-[var(--fnz-muted)]">Cargando finanzas…</p>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="finanzas-app px-4 py-10" data-theme={theme}>
        <div className="mx-auto mb-6 max-w-md">
          <Link to="/" className="text-[15px] font-medium text-[var(--fnz-accent)]">
            ← Inicio
          </Link>
        </div>
        <AuthScreen />
      </div>
    )
  }

  if (section !== 'resumen' && section !== 'ajustes' && !isSectionVisible(section)) {
    return <Navigate to="/finanzas" replace />
  }

  return (
    <div className="finanzas-app relative" data-theme={theme}>
      <SurplusModal />
      {kitty && (
        <img
          src="/finanzas/bow.png"
          alt=""
          className="pointer-events-none fixed top-5 right-8 z-0 hidden h-10 w-10 object-contain opacity-90 sm:block"
        />
      )}
      {kitty && <MelodyGuide />}
      <div
        className={`relative z-10 mx-auto max-w-6xl px-3 py-4 lg:grid lg:gap-6 lg:px-4 lg:py-8 ${
          kitty ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[240px_1fr_300px]'
        }`}
      >
        <div className="sticky top-0 z-30 -mx-3 space-y-3 border-b border-[var(--fnz-line)] bg-[var(--fnz-bg)]/95 px-3 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <AppBrand initial={initial} kitty={kitty} account={account} />
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/finanzas/ajustes"
                aria-label="Ajustes"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fnz-card)] text-[var(--fnz-accent)] shadow-[var(--fnz-shadow)]"
              >
                {kitty ? (
                  <img src="/finanzas/bow.png" alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <SettingsIcon />
                )}
              </Link>
              <button
                type="button"
                aria-label="Más opciones"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fnz-card)] text-[var(--fnz-muted)] shadow-[var(--fnz-shadow)]"
              >
                <MoreIcon />
              </button>
            </div>
          </div>
          <MobileNav items={navItems} />
          {menuOpen && <MobileMenu kitty={kitty} onClose={() => setMenuOpen(false)} onLogout={logout} />}
        </div>

        <aside className="hidden space-y-5 lg:block">
          <div className="flex items-center justify-between gap-3">
            <AppBrand initial={initial} kitty={kitty} account={account} />
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
          <SidebarNav items={navItems} />
          <div className="flex flex-col gap-3 px-1">
            <Link to="/finanzas/ajustes" className="text-[15px] font-medium text-[var(--fnz-accent)]">
              Ajustes y temas
            </Link>
            <Link to="/" className="text-[15px] font-medium text-[var(--fnz-accent)]">
              Volver al inicio
            </Link>
            <button type="button" onClick={logout} className="text-left text-[15px] font-medium text-[var(--fnz-danger)]">
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="mt-4 min-w-0 space-y-5 lg:mt-0">
          <Outlet />
        </main>

        {!kitty && (
          <div className="hidden lg:block">
            <KabinPanel section={section} />
          </div>
        )}
      </div>
    </div>
  )
}
