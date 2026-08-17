export const THEME_KEY = 'kabin-finanzas-theme'

export const THEMES = [
  {
    id: 'ios',
    name: 'Claro iOS',
    tag: 'Actual',
    description: 'Fondo suave, tarjetas blancas y acentos tipo iPhone.',
  },
  {
    id: 'kitty',
    name: 'My Melody',
    tag: 'Kawaii',
    description: 'El mismo fondo claro, con botones, textos de acento y el lazo en rosa.',
  },
]

export function loadTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'kitty' || value === 'ios') return value
  } catch {
    /* ignore */
  }
  return 'ios'
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}
