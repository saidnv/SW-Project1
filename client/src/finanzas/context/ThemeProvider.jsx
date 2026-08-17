import { useCallback, useMemo, useState } from 'react'
import { loadTheme, saveTheme } from '../lib/theme'
import { ThemeContext } from './ThemeContext'

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(loadTheme)
  const [transitionTo, setTransitionTo] = useState(null)

  const setTheme = useCallback((next) => {
    setThemeState((current) => {
      if (next === current || next === null) return current
      setTransitionTo(next)
      window.setTimeout(() => {
        saveTheme(next)
        setThemeState(next)
      }, 240)
      window.setTimeout(() => setTransitionTo(null), 980)
      return current
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, transitionTo }),
    [theme, setTheme, transitionTo],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
