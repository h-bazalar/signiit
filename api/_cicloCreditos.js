// Fuente única de verdad del ciclo VIP perezoso: vencimiento + downgrade.
// La usan api/sesion-init.js (en cada carga de la app) y api/analisis.js
// (defensa en profundidad al correr un análisis). NO routear: es helper.
//
// Modelo (pago único mensual):
//  - El acceso VIP lo gobierna vip_expires_at. Cada pago confirmado por el
//    webhook de MercadoPago setea plan='vip', creditos_reset_at=now() y
//    vip_expires_at = now()+30d (créditos frescos por pago).
//  - Acá NO se refrescan créditos a los 30 días: eso lo hace el pago. Acá solo
//    se VENCE al VIP cuya ventana pagada ya pasó (now() >= vip_expires_at),
//    bajándolo a 'free' de forma perezosa, sin cron.

export async function resolverCicloCreditos(supabaseAdmin, clerkId, usuario) {
  const statsActuales = {
    generaciones_estaticos: usuario.generaciones_estaticos ?? 0,
    generaciones_video: usuario.generaciones_video ?? 0,
    analisis_realizados: usuario.analisis_realizados ?? 0,
  };

  // No-VIP nunca cambia acá (Free: créditos únicos, no renuevan).
  if (usuario.plan !== "vip") {
    return {
      plan: usuario.plan,
      stats: statsActuales,
      creditos_reset_at: usuario.creditos_reset_at ?? null,
      vip_expires_at: usuario.vip_expires_at ?? null,
      reseteado: false,
      vencido: false,
    };
  }

  // ── VENCIMIENTO (prioridad): VIP cuya ventana pagada ya pasó → downgrade a free.
  // Solo con timestamp real ya vencido. vip_expires_at null → fail-open (no se le
  // quita acceso a un VIP por falta de dato; el webhook siempre lo setea).
  const expiresAt = usuario.vip_expires_at
    ? new Date(usuario.vip_expires_at)
    : null;

  if (expiresAt && Date.now() >= expiresAt.getTime()) {
    await supabaseAdmin
      .from("usuarios")
      .update({
        plan: "free",
        vip_expires_at: null,
        recordatorio_vip_enviado_at: null,
      })
      .eq("clerk_id", clerkId);
    // Contadores intactos: el ex-VIP no recibe un set nuevo de créditos free.
    // Se limpian los campos VIP (vencimiento + marca de recordatorio): un free
    // no debe arrastrar datos de VIP.
    return {
      plan: "free",
      stats: statsActuales,
      creditos_reset_at: usuario.creditos_reset_at ?? null,
      vip_expires_at: null,
      reseteado: false,
      vencido: true,
    };
  }

  // ── VIP vigente sin creditos_reset_at (caso heredado) → anclar SIN cerar.
  const resetAt = usuario.creditos_reset_at
    ? new Date(usuario.creditos_reset_at)
    : null;

  if (!resetAt) {
    const ahora = new Date().toISOString();
    await supabaseAdmin
      .from("usuarios")
      .update({ creditos_reset_at: ahora })
      .eq("clerk_id", clerkId);
    return {
      plan: "vip",
      stats: statsActuales,
      creditos_reset_at: ahora,
      vip_expires_at: usuario.vip_expires_at ?? null,
      reseteado: false,
      vencido: false,
    };
  }

  // ── VIP vigente: sin cambios. Los créditos los refresca el pago (webhook), no acá.
  return {
    plan: "vip",
    stats: statsActuales,
    creditos_reset_at: usuario.creditos_reset_at,
    vip_expires_at: usuario.vip_expires_at,
    reseteado: false,
    vencido: false,
  };
}
