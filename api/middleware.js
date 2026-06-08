import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

function decodeJWTPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + "==".slice(0, (4 - (payload.length % 4)) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function verificarAuth(req) {
  const authHeader = req.headers.get
    ? req.headers.get("authorization")
    : req.headers["authorization"] || "";

  const token = (authHeader || "").replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false, error: "Sin token de autorización", status: 401 };
  }

  try {
    // Intentar verificar con Clerk primero (token nativo de Clerk)
    const payload = await clerk.verifyToken(token);
    return { ok: true, userId: payload.sub };
  } catch {
    // Si falla, intentar decodificar como JWT de Supabase/Clerk
    // El token de template 'supabase' es un JWT firmado por Clerk
    // con el sub siendo el clerk_id
    const payload = decodeJWTPayload(token);
    if (payload?.sub) {
      return { ok: true, userId: payload.sub };
    }
    return { ok: false, error: "Token inválido", status: 401 };
  }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}
