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

    // La ruta del logo en MinIO es determinística (logos/{userId}/{negocioId}.{ext}),
    // por lo que al CAMBIAR el logo la URL resultaría idéntica a la anterior y ni
    // React ni el navegador detectarían el cambio (se queda el logo viejo). Le
    // agregamos una versión (?v=timestamp) para forzar el refresco en todos los
    // lectores: panel, tarjeta del negocio, header de Campañas y pipeline n8n.
    // Las imágenes de referencia NO lo necesitan (su id es un UUID único por subida).
    let urlFinal = finalUrl;

    if (tipo === "logo") {
      urlFinal = `${finalUrl}?v=${Date.now()}`;
      const { error } = await supabaseAdmin
        .from("negocios")
        .update({ logo_url: urlFinal })
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

    return jsonResponse({ ok: true, url: urlFinal });
  } catch (err) {
    console.error("Error en upload-confirm:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
