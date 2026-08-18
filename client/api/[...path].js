export default async function handler(req, res) {
  const base = String(process.env.FINANZAS_API_URL || '').replace(/\/$/, '')
  if (!base) {
    res.status(503).json({
      status: 'down',
      error: 'Falta FINANZAS_API_URL en Vercel. Debe ser la URL de la API en Render.',
    })
    return
  }

  const target = `${base}${req.url}`
  const headers = {}
  if (req.headers.authorization) headers.Authorization = req.headers.authorization
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']

  const init = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  try {
    const upstream = await fetch(target, init)
    const text = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'
    res.status(upstream.status).setHeader('Content-Type', contentType).send(text)
  } catch {
    res.status(502).json({ ok: false, error: 'No se pudo contactar la API de finanzas.' })
  }
}
