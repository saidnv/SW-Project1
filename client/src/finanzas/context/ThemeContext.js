import { createContext, useContext } from 'react'

export const ThemeContext = createContext(null)

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return value
}
