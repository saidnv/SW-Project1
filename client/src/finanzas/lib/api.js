const BASE = import.meta.env.VITE_FINANZAS_API_URL || ''
const TOKEN_KEY = 'kabin-finanzas-token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error || 'No se pudo completar la petición.')
  }
  if (payload.token) setToken(payload.token)
  return payload
}

export function clearApiToken() {
  setToken('')
}

export async function pingApi() {
  try {
    const res = await fetch(`${BASE}/api/health`)
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

export function fetchMe() {
  return request('/api/me')
}

export function registerAccount(username, pin, data) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, pin, data }),
  })
}

export function loginAccount(username, pin) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  })
}

export async function logoutAccount() {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } finally {
    setToken('')
  }
}

export function saveLedger(data) {
  return request('/api/ledger', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export function isLedgerEmpty(data) {
  if (!data) return true
  return ['creditos', 'deudas', 'pagos', 'ingresos', 'ahorros'].every(
    (key) => !Array.isArray(data[key]) || data[key].length === 0,
  )
}
