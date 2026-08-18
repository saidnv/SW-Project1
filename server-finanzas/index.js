import 'dotenv/config'
import cors from 'cors'
import crypto from 'node:crypto'
import express from 'express'
import bcrypt from 'bcryptjs'
import { pool, ensureSchema } from './db.js'

const PORT = process.env.PORT || 3002
const MAX_ACCOUNTS = 5
const SESSION_DAYS = 30

const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const emptyLedger = {
  creditos: [],
  deudas: [],
  pagos: [],
  ingresos: [],
  ahorros: [],
  history: [],
}

function publicAccount(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    isAdmin: isAdminUsername(row.username),
    data: row.data && typeof row.data === 'object' ? row.data : emptyLedger,
  }
}

function isAdminUsername(name) {
  return String(name || '').trim().toLowerCase() === 'robinson'
}

const ADMIN_USERNAME = 'robinson'
const ADMIN_PIN = process.env.ADMIN_PIN || '2524'

async function ensureAdmin() {
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10)
  const exists = await pool.query('SELECT id FROM accounts WHERE lower(username) = lower($1)', [ADMIN_USERNAME])
  if (exists.rowCount) {
    await pool.query('UPDATE accounts SET pin_hash = $1 WHERE id = $2', [pinHash, exists.rows[0].id])
    return
  }
  await pool.query(
    `INSERT INTO accounts (username, pin_hash, data)
     VALUES ($1, $2, $3::jsonb)`,
    [ADMIN_USERNAME, pinHash, JSON.stringify(emptyLedger)],
  )
}

async function requireAdmin(req, res, next) {
  try {
    const account = await accountFromToken(req)
    if (!account) {
      res.status(401).json({ ok: false, error: 'Sesión no iniciada.' })
      return
    }
    if (!isAdminUsername(account.username)) {
      res.status(403).json({ ok: false, error: 'Solo el administrador puede hacer esto.' })
      return
    }
    req.account = account
    next()
  } catch (error) {
    next(error)
  }
}

async function createSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex')
  await pool.query(
    `INSERT INTO sessions (token, account_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, accountId, String(SESSION_DAYS)],
  )
  return token
}

function bearerToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return null
}

async function accountFromToken(req) {
  const token = bearerToken(req)
  if (!token) return null
  const { rows } = await pool.query(
    `SELECT a.id, a.username, a.created_at, a.data
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  )
  return rows[0] ?? null
}

async function requireAccount(req, res, next) {
  try {
    const account = await accountFromToken(req)
    if (!account) {
      res.status(401).json({ ok: false, error: 'Sesión no iniciada.' })
      return
    }
    req.account = account
    req.sessionToken = bearerToken(req)
    next()
  } catch (error) {
    next(error)
  }
}

function normalizeLedger(data) {
  const source = data && typeof data === 'object' ? data : {}
  return {
    creditos: Array.isArray(source.creditos) ? source.creditos : [],
    deudas: Array.isArray(source.deudas) ? source.deudas : [],
    pagos: Array.isArray(source.pagos) ? source.pagos : [],
    ingresos: Array.isArray(source.ingresos) ? source.ingresos : [],
    ahorros: Array.isArray(source.ahorros) ? source.ahorros : [],
    history: Array.isArray(source.history) ? source.history.slice(0, 120) : [],
  }
}

const app = express()
const corsOptions = {
  origin: CLIENT_ORIGINS.length === 1 ? CLIENT_ORIGINS[0] : CLIENT_ORIGINS,
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim()
    const pin = String(req.body?.pin || '')
    const imported = normalizeLedger(req.body?.data)

    if (isAdminUsername(username)) {
      res.status(400).json({ ok: false, error: 'Ese nombre está reservado.' })
      return
    }

    if (!username) {
      res.status(400).json({ ok: false, error: 'Escribe un nombre de usuario.' })
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      res.status(400).json({ ok: false, error: 'El PIN debe tener 4 dígitos.' })
      return
    }

    const count = await pool.query('SELECT COUNT(*)::int AS total FROM accounts')
    if (count.rows[0].total >= MAX_ACCOUNTS) {
      res.status(400).json({ ok: false, error: `Máximo de ${MAX_ACCOUNTS} cuentas.` })
      return
    }

    const exists = await pool.query('SELECT id FROM accounts WHERE lower(username) = lower($1)', [username])
    if (exists.rowCount) {
      res.status(400).json({ ok: false, error: 'Ese nombre ya existe.' })
      return
    }

    const pinHash = await bcrypt.hash(pin, 10)
    const created = await pool.query(
      `INSERT INTO accounts (username, pin_hash, data)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, username, created_at, data`,
      [username, pinHash, JSON.stringify(imported)],
    )
    const account = created.rows[0]
    const token = await createSession(account.id)
    res.json({ ok: true, token, account: publicAccount(account) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim()
    const pin = String(req.body?.pin || '')
    const { rows } = await pool.query(
      'SELECT id, username, pin_hash, created_at, data FROM accounts WHERE lower(username) = lower($1)',
      [username],
    )
    const account = rows[0]
    if (!account || !(await bcrypt.compare(pin, account.pin_hash))) {
      res.status(401).json({ ok: false, error: 'Usuario o PIN incorrecto.' })
      return
    }
    const token = await createSession(account.id)
    res.json({ ok: true, token, account: publicAccount(account) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const token = bearerToken(req)
    if (token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token])
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/me', requireAccount, (req, res) => {
  res.json({ ok: true, account: publicAccount(req.account) })
})

app.get('/api/admin/accounts', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, created_at FROM accounts ORDER BY created_at ASC',
    )
    res.json({
      ok: true,
      accounts: rows.map((row) => ({
        id: row.id,
        username: row.username,
        createdAt: row.created_at,
        isAdmin: isAdminUsername(row.username),
      })),
    })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/accounts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id || '')
    const { rows } = await pool.query('SELECT id, username FROM accounts WHERE id = $1', [id])
    const target = rows[0]
    if (!target) {
      res.status(404).json({ ok: false, error: 'Usuario no encontrado.' })
      return
    }
    if (isAdminUsername(target.username) || target.id === req.account.id) {
      res.status(400).json({ ok: false, error: 'No puedes eliminar al administrador.' })
      return
    }
    await pool.query('DELETE FROM accounts WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.put('/api/ledger', requireAccount, async (req, res, next) => {
  try {
    const data = normalizeLedger(req.body?.data)
    const updated = await pool.query(
      `UPDATE accounts SET data = $1::jsonb WHERE id = $2
       RETURNING id, username, created_at, data`,
      [JSON.stringify(data), req.account.id],
    )
    res.json({ ok: true, account: publicAccount(updated.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ ok: false, error: 'Error interno del servidor.' })
})

async function start() {
  await ensureSchema()
  await ensureAdmin()
  app.listen(PORT, () => {
    console.log(`Kabin finanzas API en http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
