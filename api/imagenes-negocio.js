import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const url = new URL(req.url);
    const negocioId = url.searchParams.get("negocioId");
    if (!negocioId) return errorResponse("negocioId requerido", 400);

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    const { data, error } = await supabaseAdmin
      .from("negocio_imagenes")
      .select("id, url, nombre, created_at")
      .eq("negocio_id", negocioId)
      .eq("usuario_id", auth.userId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return jsonResponse({ imagenes: data || [] });
  } catch (err) {
    console.error("Error en imagenes-negocio:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
