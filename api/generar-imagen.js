import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = typeof req.json === "function" ? await req.json() : req.body;
    const { negocioId, formato, modoImagen, imagenesReferencia } = body;

    if (!negocioId) return errorResponse("negocioId requerido", 400);

    const formatosValidos = ["feed_1_1", "feed_4_5", "stories_9_16"];
    if (!formato || !formatosValidos.includes(formato)) {
      return errorResponse(
        "formato inválido. Debe ser: feed_1_1, feed_4_5, stories_9_16",
        400,
      );
    }

    const modosValidos = ["ia_pura", "foto_directa", "foto_referencia"];
    const modoFinal = modosValidos.includes(modoImagen)
      ? modoImagen
      : "ia_pura";

    // imagenesReferencia solo aplica para foto_directa y foto_referencia
    const urlsReferencia =
      modoFinal !== "ia_pura" && Array.isArray(imagenesReferencia)
        ? imagenesReferencia.slice(0, 3)
        : [];

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

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
      return errorResponse("N8N_WEBHOOK_IMAGENES no configurado", 500);

    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campanaId,
        negocioId,
        clerkUserId: auth.userId,
        formato,
        modoImagen: modoFinal,
        imagenesReferencia: urlsReferencia,
      }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => console.error("Error disparando n8n imágenes:", err));

    return jsonResponse({ status: "processing", campanaId });
  } catch (err) {
    console.error("Error en generar-imagen:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
