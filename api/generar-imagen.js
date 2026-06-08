import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = await req.json();
    const { negocioId, angulo } = body;

    if (!negocioId) return errorResponse("negocioId requerido", 400);

    // Crear registro en campanas_generadas con estado 'pendiente'
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
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError)
      throw new Error("Error creando registro: " + insertError.message);

    const campanaId = campana.id;

    // Disparar n8n sin esperar respuesta (fire and forget)
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
        angulo: angulo || {},
      }),
    }).catch((err) => console.error("Error disparando n8n imágenes:", err));

    // Retornar inmediatamente con el id para polling
    return jsonResponse({ status: "processing", campanaId });
  } catch (err) {
    console.error("Error en generar-imagen:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
