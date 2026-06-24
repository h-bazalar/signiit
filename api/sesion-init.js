import { verificarAuth } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";
import { resolverCicloCreditos } from "./_cicloCreditos.js";

// Arranque de sesión. App.jsx lo llama al montar. Centraliza el reset mensual
// perezoso de los 3 contadores sin importar qué pantalla abra el usuario.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }
  const clerkId = auth.userId;

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { data: usuario, error: errUser } = await supabaseAdmin
    .from("usuarios")
    .select(
      "plan, generaciones_estaticos, generaciones_video, analisis_realizados, creditos_reset_at, vip_expires_at",
    )
    .eq("clerk_id", clerkId)
    .single();

  if (errUser || !usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  try {
    const ciclo = await resolverCicloCreditos(supabaseAdmin, clerkId, usuario);
    return res.status(200).json({
      plan: ciclo.plan,
      stats: ciclo.stats,
      creditos_reset_at: ciclo.creditos_reset_at,
      vip_expires_at: ciclo.vip_expires_at,
      reseteado: ciclo.reseteado,
      vencido: ciclo.vencido,
    });
  } catch (err) {
    console.error("Error en sesion-init:", err);
    return res.status(500).json({ error: "Error inicializando la sesión." });
  }
}
