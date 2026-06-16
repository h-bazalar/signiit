// Fuente única de verdad del reset mensual perezoso.
// La usan api/sesion-init.js (en cada carga de la app) y api/analisis.js
// (defensa en profundidad al correr un análisis). NO routear: es helper.
const DIAS_CICLO = 30;

export async function resolverCicloCreditos(supabaseAdmin, clerkId, usuario) {
  const statsActuales = {
    generaciones_estaticos: usuario.generaciones_estaticos ?? 0,
    generaciones_video: usuario.generaciones_video ?? 0,
    analisis_realizados: usuario.analisis_realizados ?? 0,
  };

  // No-VIP nunca se resetea (Free: créditos únicos, no renuevan).
  if (usuario.plan !== "vip") {
    return {
      stats: statsActuales,
      creditos_reset_at: usuario.creditos_reset_at ?? null,
      reseteado: false,
    };
  }

  const resetAt = usuario.creditos_reset_at
    ? new Date(usuario.creditos_reset_at)
    : null;

  // reset_at null → anclar a ahora SIN cerar (no borrar uso legítimo).
  if (!resetAt) {
    const ahora = new Date().toISOString();
    await supabaseAdmin
      .from("usuarios")
      .update({ creditos_reset_at: ahora })
      .eq("clerk_id", clerkId);
    return { stats: statsActuales, creditos_reset_at: ahora, reseteado: false };
  }

  const cicloVencido = Date.now() - resetAt.getTime() >= DIAS_CICLO * 864e5;

  // Ciclo vencido (≥30 días con fecha real) → cero los 3 contadores + bump.
  if (cicloVencido) {
    const ahora = new Date().toISOString();
    await supabaseAdmin
      .from("usuarios")
      .update({
        generaciones_estaticos: 0,
        generaciones_video: 0,
        analisis_realizados: 0,
        creditos_reset_at: ahora,
      })
      .eq("clerk_id", clerkId);
    return {
      stats: {
        generaciones_estaticos: 0,
        generaciones_video: 0,
        analisis_realizados: 0,
      },
      creditos_reset_at: ahora,
      reseteado: true,
    };
  }

  // Ciclo vigente: sin cambios.
  return {
    stats: statsActuales,
    creditos_reset_at: usuario.creditos_reset_at,
    reseteado: false,
  };
}
