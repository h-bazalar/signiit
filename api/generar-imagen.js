import { verificarAuth, jsonResponse, errorResponse } from './middleware.js'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Auth
  const auth = await verificarAuth(req)
  if (!auth.ok) return errorResponse(auth.error, auth.status)

  try {
    const body = await req.json()
    const { negocioId, webhook_url } = body

    if (!negocioId) return errorResponse('negocioId requerido', 400)

    // Llamada al webhook n8n
    const n8nUrl = process.env.N8N_WEBHOOK_IMAGENES
    if (!n8nUrl) return errorResponse('N8N_WEBHOOK_IMAGENES no configurado', 500)

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, clerkUserId: auth.userId }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      throw new Error(`n8n respondió con status ${response.status}`)
    }

    const data = await response.json()
    return jsonResponse(data)

  } catch (err) {
    console.error('Error en generar-imagen:', err)
    return errorResponse(err.message || 'Error interno', 500)
  }
}
