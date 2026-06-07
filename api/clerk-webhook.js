import { createClient } from '@supabase/supabase-js'
import { Webhook } from 'svix'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('Webhook secret no configurado', { status: 500 })
  }

  const svixId        = req.headers['svix-id']
  const svixTimestamp = req.headers['svix-timestamp']
  const svixSignature = req.headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Headers de Svix faltantes', { status: 400 })
  }

  const body = await req.text()

  let event
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Firma inválida', { status: 400 })
  }

  const { type, data } = event

  // ── user.created ─────────────────────────────────
  if (type === 'user.created') {
    const email = data.email_addresses?.[0]?.email_address || ''
    const nombre = `${data.first_name || ''} ${data.last_name || ''}`.trim()

    const { error } = await supabase.from('usuarios').insert({
      clerk_id:               data.id,
      email,
      nombre,
      plan:                   'free',
      generaciones_estaticos: 0,
      generaciones_video:     0,
      analisis_realizados:    0,
      creditos_reset_at:      new Date().toISOString(),
    })

    if (error) console.error('Error creando usuario en Supabase:', error)
  }

  // ── user.updated ─────────────────────────────────
  if (type === 'user.updated') {
    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      })
      .eq('clerk_id', data.id)

    if (error) console.error('Error actualizando usuario:', error)
  }

  return new Response('OK', { status: 200 })
}
