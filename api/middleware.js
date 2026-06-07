import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function verificarAuth(req) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return { ok: false, error: 'Sin token de autorización', status: 401 }
  }

  try {
    const payload = await clerk.verifyToken(token)
    return { ok: true, userId: payload.sub }
  } catch (err) {
    return { ok: false, error: 'Token inválido', status: 401 }
  }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status)
}
