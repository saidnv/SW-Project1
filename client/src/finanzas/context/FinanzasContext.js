import { createContext, useContext } from 'react'

export const FinanzasContext = createContext(null)

export function useFinanzas() {
  const value = useContext(FinanzasContext)
  if (!value) {
    throw new Error('useFinanzas debe usarse dentro de FinanzasProvider')
  }
  return value
}
