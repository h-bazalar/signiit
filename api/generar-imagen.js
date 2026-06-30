import { verificarAuth } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";
import { resolverCicloCreditos } from "./_cicloCreditos.js";
import { PLANES } from "../src/utils/constants.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const clerkId = auth.userId;

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  // ── Leer usuario: plan, contador, fecha de ciclo ──
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

  // ── Vencimiento/ciclo VIP (misma fuente única de verdad que analisis.js) ──
  // Corre ANTES del gate: si la ventana VIP venció, el helper baja a 'free' y
  // resetea contadores si corresponde. Gateamos sobre el ciclo resuelto, no
  // sobre el valor viejo de la lectura.
  const ciclo = await resolverCicloCreditos(supabaseAdmin, clerkId, usuario);

  const planUsuario = PLANES[ciclo.plan] ? ciclo.plan : "free";
  const limiteGeneraciones = PLANES[planUsuario].generacionesTotal;
  const generacionesUsadas = ciclo.stats.generaciones_estaticos ?? 0;

  // ── Gate de créditos (mismo patrón de límite que analisis.js) ──
  if (generacionesUsadas >= limiteGeneraciones) {
    return res.status(429).json({
      error:
        planUsuario === "free"
          ? "Usaste tu generación gratuita. Pásate a VIP para seguir generando creativos."
          : `Alcanzaste tu límite de ${limiteGeneraciones} generaciones de este ciclo. Se renueva al inicio de tu próximo mes.`,
      code: "LIMITE_ALCANZADO",
    });
  }

  try {
    const body = req.body;
    const {
      negocioId,
      formato,
      modoImagen,
      imagenesReferencia,
      angulo,
      modoApp,
    } = body;

    if (!negocioId)
      return res.status(400).json({ error: "negocioId requerido" });

    const formatosValidos = ["feed_1_1", "feed_4_5", "stories_9_16"];
    if (!formato || !formatosValidos.includes(formato)) {
      return res.status(400).json({ error: "formato inválido" });
    }

    const modosValidos = ["ia_pura", "foto_directa", "foto_referencia"];
    const modoFinal = modosValidos.includes(modoImagen)
      ? modoImagen
      : "ia_pura";

    const modoAppFinal = modoApp === "organico" ? "organico" : "meta_ads";

    const urlsReferencia =
      modoFinal !== "ia_pura" && Array.isArray(imagenesReferencia)
        ? imagenesReferencia.slice(0, 3)
        : [];

    const { data: negocio, error: negocioError } = await supabaseAdmin
      .from("negocios")
      .select("logo_url")
      .eq("id", negocioId)
      .single();

    if (negocioError)
      throw new Error("Error leyendo negocio: " + negocioError.message);

    const negocioLogoUrl = negocio?.logo_url || "";

    const { data: campana, error: insertError } = await supabaseAdmin
      .from("campanas_generadas")
      .insert({
        usuario_id: auth.userId,
        negocio_id: negocioId,
        tipo: "imagen",
        formato,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError)
      throw new Error("Error creando registro: " + insertError.message);

    const campanaId = campana.id;
    const n8nUrl = process.env.N8N_WEBHOOK_IMAGENES;
    if (!n8nUrl)
      return res
        .status(500)
        .json({ error: "N8N_WEBHOOK_IMAGENES no configurado" });

    const n8nRes = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campanaId,
        negocioId,
        clerkUserId: auth.userId,
        formato,
        modoImagen: modoFinal,
        modoApp: modoAppFinal,
        imagenesReferencia: urlsReferencia,
        angulo,
        negocioLogoUrl,
      }),
      signal: AbortSignal.timeout(480000),
    });

    if (!n8nRes.ok) {
      const errorText = await n8nRes.text();
      console.error("[Imagen] n8n error:", n8nRes.status, errorText);
      return res
        .status(502)
        .json({ error: "Error en el pipeline de generación" });
    }

    const n8nData = await n8nRes.json();
    return res.status(200).json({
      status: "processing",
      campanaId: n8nData.campanaId || campanaId,
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res
        .status(504)
        .json({ error: "El proceso tardó demasiado. Intenta de nuevo." });
    }
    console.error("[Imagen] Error:", err);
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
