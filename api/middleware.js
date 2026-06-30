import { verifyToken } from "@clerk/backend";

export async function verificarAuth(req) {
  const authHeader = req.headers.get
    ? req.headers.get("authorization")
    : req.headers["authorization"] || "";

  const token = (authHeader || "").replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false, error: "Sin token de autorización", status: 401 };
  }

  try {
    // Verificación criptográfica real de la firma del token (Clerk).
    // `verifyToken` se IMPORTA de @clerk/backend (no es método del client).
    // Única vía de autenticación: si la firma no valida, se rechaza.
    // NO existe fallback que decodifique el JWT sin verificar firma — eso
    // permitía suplantar a cualquier usuario fabricando un token con su sub.
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (!payload?.sub) {
      return { ok: false, error: "Token inválido", status: 401 };
    }
    return { ok: true, userId: payload.sub };
  } catch (err) {
    // Diagnóstico (no reabre ningún bypass): deja en los logs POR QUÉ se
    // rechazó el token, para distinguir un ataque de un token legítimo mal
    // configurado (firma, exp, clock skew, azp...). La respuesta es siempre 401.
    console.error("[Auth] Token rechazado:", err?.message || err);
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
