import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFinanzas } from '../context/FinanzasContext'
import { useTheme } from '../context/ThemeContext'
import { getGuideTitle, getKabinAdvice, getKabinGuide } from '../lib/kabin'
import { emptyLedger } from '../lib/storage'
import { loadMelodySeen, saveMelodySeen } from '../lib/melodySeen'

function sectionFromPath(pathname) {
  if (pathname.includes('/creditos')) return 'creditos'
  if (pathname.includes('/deudas')) return 'deudas'
  if (pathname.includes('/pagos')) return 'pagos'
  if (pathname.includes('/ingresos')) return 'ingresos'
  if (pathname.includes('/ahorros')) return 'ahorros'
  if (pathname.includes('/prestamos')) return 'prestamos'
  if (pathname.includes('/ajustes')) return 'ajustes'
  return 'resumen'
}

function pickPopup({ seen, section, advice, showIntro }) {
  if (showIntro) {
    return {
      id: 'intro',
      kind: 'intro',
      title: '¡Hola, soy My Melody!',
      body: 'Estoy aquí para cuidarte el bolsillo, con cariño y en soles. No voy a molestarte a cada rato: solo vengo cuando haya una guía o algo importante. ¡Tú puedes!',
    }
  }

  const important = advice.messages.find((item) => item.important)
  if (important && !seen.advice[important.id]) {
    return {
      id: important.id,
      kind: 'advice',
      title: important.title,
      body: important.body,
    }
  }

  if (section !== 'resumen' && !seen.guides[section]) {
    return {
      id: `guide-${section}`,
      kind: 'guide',
      title: `Te ayudo con ${getGuideTitle(section).toLowerCase()}`,
      body: getKabinGuide(section).join(' '),
      section,
    }
  }

  return null
}

export default function MelodyGuide() {
  const { theme, transitionTo } = useTheme()
  const { account } = useFinanzas()
  const location = useLocation()
  const section = sectionFromPath(location.pathname)
  const [seen, setSeen] = useState(loadMelodySeen)
  const [popup, setPopup] = useState(null)
  const pausePath = useRef(null)

  const advice = useMemo(
    () =>
      getKabinAdvice(account?.data ?? emptyLedger(), 'My Melody'),
    [account],
  )

  useEffect(() => {
    if (theme !== 'kitty' || transitionTo) {
      setPopup(null)
      return
    }
    if (pausePath.current === location.pathname) {
      setPopup(null)
      return
    }
    pausePath.current = null
    setPopup(pickPopup({ seen, section, advice, showIntro: !seen.intro }))
  }, [theme, transitionTo, section, advice, seen, location.pathname])

  if (theme !== 'kitty') return null

  function dismiss() {
    if (!popup) return
    const next = { ...seen, advice: { ...seen.advice }, guides: { ...seen.guides } }
    if (popup.kind === 'intro') next.intro = true
    if (popup.kind === 'advice') next.advice[popup.id] = true
    if (popup.kind === 'guide' && popup.section) next.guides[popup.section] = true
    pausePath.current = location.pathname
    setSeen(next)
    saveMelodySeen(next)
    setPopup(null)
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex max-w-[min(100%-2rem,380px)] flex-col items-end gap-3">
      {popup && (
        <div className="fnz-melody-in pointer-events-auto flex items-end gap-2">
          <div className="relative mb-6 max-w-[260px] rounded-[22px] bg-white px-4 py-3 text-[14px] leading-relaxed text-[var(--fnz-text)] shadow-[var(--fnz-shadow)]">
            <span className="absolute -right-1.5 bottom-7 h-3 w-3 rotate-45 bg-white" />
            <p className="text-[13px] font-semibold text-[var(--fnz-accent)]">{popup.title}</p>
            <p className="mt-1 text-[13px] text-zinc-600">{popup.body}</p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 rounded-full bg-[var(--fnz-accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              Gracias, Melody
            </button>
          </div>
          <div className="relative">
            <span className="fnz-heart absolute -top-2 left-3 text-lg">♡</span>
            <span className="fnz-heart absolute top-4 -left-2 text-sm" style={{ animationDelay: '0.25s' }}>
              ♡
            </span>
            <span className="fnz-heart absolute top-0 right-1 text-base" style={{ animationDelay: '0.45s' }}>
              ♡
            </span>
            <img src="/finanzas/my-melody.png" alt="My Melody" className="h-28 w-28 object-contain drop-shadow-md" />
          </div>
        </div>
      )}
    </div>
  )
}
