import { verificarAuth, jsonResponse, errorResponse } from './middleware.js'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = await verificarAuth(req)
  if (!auth.ok) return errorResponse(auth.error, auth.status)

  // TODO: implementar análisis de campañas (exclusivo plan Pro)
  // Lógica heredada de Orbiit:
  // - Recibe 2 CSVs de Meta Ads Manager (7d y 30d)
  // - Pasa como texto plano al LLM
  // - Modelo: gpt-4.1-mini → fallback claude-haiku-4-5
  // - Retorna: escalar, mantener, apagar, revivir, cola, alertasFatiga,
  //            resumenEjecutivo, chartData, ensenanza

  return jsonResponse({ mensaje: 'Análisis — próximamente' }, 200)
}
