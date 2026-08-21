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
    prestamos: [],
    prestamosRecibidos: [],
    prestamoDisponible: 0,
  history: [],
  closedMonths: [],
  periodKey: null,
  hiddenSections: [],
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
    prestamos: Array.isArray(source.prestamos) ? source.prestamos : [],
    prestamosRecibidos: Array.isArray(source.prestamosRecibidos) ? source.prestamosRecibidos : [],
    prestamoDisponible: Number(source.prestamoDisponible) || 0,
    history: Array.isArray(source.history) ? source.history.slice(0, 120) : [],
    closedMonths: Array.isArray(source.closedMonths) ? source.closedMonths : [],
    periodKey: typeof source.periodKey === 'string' && source.periodKey ? source.periodKey : null,
    hiddenSections: Array.isArray(source.hiddenSections)
      ? [...new Set(source.hiddenSections.filter((id) => typeof id === 'string'))]
      : [],
  }
}

function samePerson(member, account) {
  if (!member || !account) return false
  if (member.id && account.id && member.id === account.id) return true
  return String(member.username || '').toLowerCase() === String(account.username || '').toLowerCase()
}

function isAhorroMember(ahorro, account) {
  return (ahorro.members || []).some((member) => samePerson(member, account))
}

function isAhorroOwner(ahorro, account) {
  return samePerson({ id: ahorro.ownerId, username: ahorro.ownerUsername }, account)
}

function upsertAhorro(data, ahorro) {
  const ledger = normalizeLedger(data)
  const exists = ledger.ahorros.some((row) => row.id === ahorro.id)
  ledger.ahorros = exists
    ? ledger.ahorros.map((row) => (row.id === ahorro.id ? ahorro : row))
    : [ahorro, ...ledger.ahorros]
  return ledger
}

function stripAhorro(data, id) {
  const ledger = normalizeLedger(data)
  ledger.ahorros = ledger.ahorros.filter((row) => row.id !== id)
  return ledger
}

function isLinkedLoan(loan) {
  return Boolean(loan?.linked && (loan.borrowerId || loan.borrowerUsername))
}

function isLoanLender(loan, account) {
  return samePerson({ id: loan.lenderId, username: loan.lenderUsername }, account)
}

function isLoanBorrower(loan, account) {
  return samePerson({ id: loan.borrowerId, username: loan.borrowerUsername }, account)
}

function upsertList(list, item) {
  const current = Array.isArray(list) ? list : []
  const exists = current.some((row) => row.id === item.id)
  return exists ? current.map((row) => (row.id === item.id ? item : row)) : [item, ...current]
}

function upsertPrestamoRow(data, loan) {
  const ledger = normalizeLedger(data)
  ledger.prestamos = upsertList(ledger.prestamos, loan)
  return ledger
}

function upsertRecibidoRow(data, loan) {
  const ledger = normalizeLedger(data)
  ledger.prestamosRecibidos = upsertList(ledger.prestamosRecibidos, loan)
  return ledger
}

function stripRecibidoRow(data, id) {
  const ledger = normalizeLedger(data)
  ledger.prestamosRecibidos = ledger.prestamosRecibidos.filter((row) => row.id !== id)
  return ledger
}

function newerLoan(current, incoming) {
  if (!current) return incoming
  return String(incoming.updatedAt || '') >= String(current.updatedAt || '') ? incoming : current
}

function mergeIncomingShared(account, others) {
  const ledger = normalizeLedger(account.data)
  const byId = new Map()
  for (const ahorro of ledger.ahorros.filter((item) => item.shared)) {
    if (ahorro.id) byId.set(ahorro.id, ahorro)
  }
  const received = new Map()
  for (const loan of ledger.prestamosRecibidos || []) {
    if (loan.id) received.set(loan.id, loan)
  }
  const lent = new Map()
  for (const loan of ledger.prestamos || []) {
    if (loan.id) lent.set(loan.id, loan)
  }

  for (const row of others) {
    for (const ahorro of row.data?.ahorros || []) {
      if (!ahorro?.shared || !ahorro.id || !isAhorroMember(ahorro, account)) continue
      const existing = byId.get(ahorro.id)
      if (!existing || String(ahorro.updatedAt || '') >= String(existing.updatedAt || '')) {
        byId.set(ahorro.id, ahorro)
      }
    }
    for (const loan of row.data?.prestamos || []) {
      if (!isLinkedLoan(loan) || !loan.id || !isLoanBorrower(loan, account)) continue
      received.set(loan.id, newerLoan(received.get(loan.id), loan))
    }
    for (const loan of row.data?.prestamosRecibidos || []) {
      if (!isLinkedLoan(loan) || !loan.id || !isLoanLender(loan, account)) continue
      lent.set(loan.id, newerLoan(lent.get(loan.id), loan))
    }
  }

  const personal = ledger.ahorros.filter((item) => !item.shared)
  const external = (ledger.prestamos || []).filter((item) => !isLinkedLoan(item))
  const linkedLent = [...lent.values()].filter((item) => isLinkedLoan(item) && isLoanLender(item, account))
  return {
    ...ledger,
    ahorros: [...byId.values(), ...personal],
    prestamos: [...linkedLent, ...external],
    prestamosRecibidos: [...received.values()],
  }
}

async function accountWithShared(row) {
  const { rows } = await pool.query('SELECT id, username, data FROM accounts WHERE id <> $1', [row.id])
  return publicAccount({ ...row, data: mergeIncomingShared(row, rows) })
}

async function fanOutLinkedLoans(writer, previousData, nextLedger) {
  const nextLent = (nextLedger.prestamos || []).filter(isLinkedLoan)
  const prevLent = (previousData?.prestamos || []).filter(isLinkedLoan)
  const nextIds = new Set((nextLedger.prestamos || []).map((item) => item.id))
  const deleted = prevLent.filter((item) => isLoanLender(item, writer) && !nextIds.has(item.id))
  const received = nextLedger.prestamosRecibidos || []
  if (!nextLent.length && !received.length && !deleted.length) return

  const { rows } = await pool.query('SELECT id, username, data FROM accounts WHERE id <> $1', [writer.id])
  for (const row of rows) {
    let data = row.data
    let changed = false
    for (const loan of nextLent) {
      if (isLoanBorrower(loan, row)) {
        data = upsertRecibidoRow(data, loan)
        changed = true
      } else if ((data?.prestamosRecibidos || []).some((item) => item.id === loan.id)) {
        data = stripRecibidoRow(data, loan.id)
        changed = true
      }
    }
    for (const loan of received) {
      if (isLoanLender(loan, row)) {
        data = upsertPrestamoRow(data, loan)
        changed = true
      }
    }
    for (const loan of deleted) {
      if ((data?.prestamosRecibidos || []).some((item) => item.id === loan.id)) {
        data = stripRecibidoRow(data, loan.id)
        changed = true
      }
    }
    if (changed) {
      await pool.query('UPDATE accounts SET data = $1::jsonb WHERE id = $2', [
        JSON.stringify(normalizeLedger(data)),
        row.id,
      ])
    }
  }
}

async function fanOutSharedAhorros(writer, previousData, nextLedger) {
  const prevAhorros = Array.isArray(previousData?.ahorros) ? previousData.ahorros : []
  const nextAhorros = nextLedger.ahorros || []
  const nextShared = nextAhorros.filter((item) => item.shared)
  const nextIds = new Set(nextAhorros.map((item) => item.id))
  const deletedOwned = prevAhorros.filter(
    (item) => item.shared && isAhorroOwner(item, writer) && !nextIds.has(item.id),
  )
  if (!nextShared.length && !deletedOwned.length) return

  const { rows } = await pool.query('SELECT id, username, data FROM accounts WHERE id <> $1', [writer.id])
  for (const row of rows) {
    let data = row.data
    let changed = false
    for (const ahorro of nextShared) {
      if (isAhorroMember(ahorro, row)) {
        data = upsertAhorro(data, ahorro)
        changed = true
      } else if ((data?.ahorros || []).some((item) => item.id === ahorro.id)) {
        data = stripAhorro(data, ahorro.id)
        changed = true
      }
    }
    for (const ahorro of deletedOwned) {
      if ((data?.ahorros || []).some((item) => item.id === ahorro.id)) {
        data = stripAhorro(data, ahorro.id)
        changed = true
      }
    }
    if (changed) {
      await pool.query('UPDATE accounts SET data = $1::jsonb WHERE id = $2', [
        JSON.stringify(normalizeLedger(data)),
        row.id,
      ])
    }
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
    res.json({ ok: true, token, account: await accountWithShared(account) })
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
    res.json({ ok: true, token, account: await accountWithShared(account) })
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

app.get('/api/me', requireAccount, async (req, res, next) => {
  try {
    res.json({ ok: true, account: await accountWithShared(req.account) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/directory', requireAccount, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, created_at FROM accounts ORDER BY username ASC',
    )
    res.json({
      ok: true,
      accounts: rows.map((row) => ({
        id: row.id,
        username: row.username,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    next(error)
  }
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
    const account = updated.rows[0]
    await fanOutSharedAhorros(account, req.account.data, data)
    await fanOutLinkedLoans(account, req.account.data, data)
    res.json({ ok: true, account: await accountWithShared(account) })
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
