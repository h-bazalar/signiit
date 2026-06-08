import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = await req.json();
    const { tipo, negocioId, imagenId, finalUrl, nombre } = body;

    if (!tipo || !["logo", "imagen_referencia"].includes(tipo)) {
      return errorResponse("tipo inválido", 400);
    }
    if (!negocioId || !finalUrl) {
      return errorResponse("negocioId y finalUrl requeridos", 400);
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    if (tipo === "logo") {
      const { error } = await supabaseAdmin
        .from("negocios")
        .update({ logo_url: finalUrl })
        .eq("id", negocioId)
        .eq("usuario_id", auth.userId);
      if (error)
        throw new Error("Error actualizando logo_url: " + error.message);
    }

    if (tipo === "imagen_referencia") {
      if (!imagenId) return errorResponse("imagenId requerido", 400);

      const { count, error: countError } = await supabaseAdmin
        .from("negocio_imagenes")
        .select("id", { count: "exact", head: true })
        .eq("negocio_id", negocioId)
        .eq("usuario_id", auth.userId);

      if (countError)
        throw new Error("Error verificando límite: " + countError.message);
      if (count >= 3)
        return errorResponse(
          "Límite de 3 imágenes de referencia alcanzado",
          400,
        );

      const { error: insertError } = await supabaseAdmin
        .from("negocio_imagenes")
        .insert({
          id: imagenId,
          negocio_id: negocioId,
          usuario_id: auth.userId,
          url: finalUrl,
          nombre: nombre || null,
        });
      if (insertError)
        throw new Error("Error guardando imagen: " + insertError.message);
    }

    return jsonResponse({ ok: true, url: finalUrl });
  } catch (err) {
    console.error("Error en upload-confirm:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
