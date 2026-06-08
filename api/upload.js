import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

// ── Firma HMAC-SHA256 para AWS Signature V4 ──
async function hmacSHA256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    typeof data === "string" ? new TextEncoder().encode(data) : data,
  );
  return new Uint8Array(sig);
}

async function sha256Hex(data) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    typeof data === "string" ? new TextEncoder().encode(data) : data,
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Subir archivo a MinIO con AWS Signature V4 ──
async function subirAMinIO({ objectKey, fileBuffer, contentType }) {
  const endpoint = MINIO_ENDPOINT.replace(/\/$/, "");
  const url = `${endpoint}/${MINIO_BUCKET}/${objectKey}`;

  const now = new Date();
  const amzDate =
    now
      .toISOString()
      .replace(/[:-]|\.\d{3}/g, "")
      .slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(endpoint).host;
  const payloadHash = await sha256Hex(fileBuffer);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    `/${MINIO_BUCKET}/${objectKey}`,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const region = "us-east-1";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmacSHA256(`AWS4${MINIO_SECRET_KEY}`, dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  const kSigning = await hmacSHA256(kService, "aws4_request");
  const signature = toHex(await hmacSHA256(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${MINIO_ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MinIO error ${response.status}: ${text}`);
  }

  return `${endpoint}/${MINIO_BUCKET}/${objectKey}`;
}

// ── Handler principal ──
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = await req.json();
    const { tipo, negocioId, imagenId, base64, contentType, nombre } = body;

    // Validaciones
    if (!tipo || !["logo", "imagen_referencia"].includes(tipo)) {
      return errorResponse("tipo debe ser 'logo' o 'imagen_referencia'", 400);
    }
    if (!negocioId) return errorResponse("negocioId requerido", 400);
    if (!base64) return errorResponse("base64 requerido", 400);
    if (
      !contentType ||
      !["image/jpeg", "image/png", "image/webp"].includes(contentType)
    ) {
      return errorResponse("contentType inválido", 400);
    }

    // Convertir base64 a buffer
    const binaryStr = atob(base64);
    const fileBuffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      fileBuffer[i] = binaryStr.charCodeAt(i);
    }

    // Tamaño máximo: 5MB
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return errorResponse("Archivo demasiado grande. Máximo 5MB.", 400);
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    let objectKey;

    if (tipo === "logo") {
      objectKey = `logos/${auth.userId}/${negocioId}.${ext}`;
    } else {
      if (!imagenId)
        return errorResponse("imagenId requerido para imagen_referencia", 400);
      objectKey = `imagenes/${auth.userId}/${negocioId}/${imagenId}.${ext}`;
    }

    // Subir a MinIO
    const finalUrl = await subirAMinIO({ objectKey, fileBuffer, contentType });

    // Si es logo → actualizar negocios.logo_url en Supabase
    if (tipo === "logo") {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
      );
      const { error } = await supabaseAdmin
        .from("negocios")
        .update({ logo_url: finalUrl })
        .eq("id", negocioId)
        .eq("usuario_id", auth.userId);

      if (error)
        throw new Error("Error actualizando logo_url: " + error.message);
    }

    // Si es imagen_referencia → insertar en negocio_imagenes
    if (tipo === "imagen_referencia") {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
      );

      // Verificar límite de 3 imágenes
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
    console.error("Error en upload:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
