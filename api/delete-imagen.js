import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

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

async function eliminarDeMinIO(objectKey) {
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
  const payloadHash = await sha256Hex("");

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "DELETE",
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
    method: "DELETE",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`MinIO DELETE error ${response.status}: ${text}`);
  }
}

export default async function handler(req) {
  if (req.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = await req.json();
    const { tipo, imagenId, negocioId } = body;

    if (!tipo || !["logo", "imagen_referencia"].includes(tipo)) {
      return errorResponse("tipo debe ser 'logo' o 'imagen_referencia'", 400);
    }
    if (!negocioId) return errorResponse("negocioId requerido", 400);

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    if (tipo === "logo") {
      // Obtener la URL actual para extraer el objectKey
      const { data: negocio, error: fetchError } = await supabaseAdmin
        .from("negocios")
        .select("logo_url")
        .eq("id", negocioId)
        .eq("usuario_id", auth.userId)
        .single();

      if (fetchError || !negocio) {
        return errorResponse("Negocio no encontrado", 404);
      }

      if (negocio.logo_url) {
        const objectKey = negocio.logo_url.replace(
          `${MINIO_ENDPOINT.replace(/\/$/, "")}/${MINIO_BUCKET}/`,
          "",
        );
        await eliminarDeMinIO(objectKey);
      }

      const { error: updateError } = await supabaseAdmin
        .from("negocios")
        .update({ logo_url: null })
        .eq("id", negocioId)
        .eq("usuario_id", auth.userId);

      if (updateError)
        throw new Error("Error actualizando logo_url: " + updateError.message);
    }

    if (tipo === "imagen_referencia") {
      if (!imagenId) return errorResponse("imagenId requerido", 400);

      const { data: imagen, error: fetchError } = await supabaseAdmin
        .from("negocio_imagenes")
        .select("url")
        .eq("id", imagenId)
        .eq("negocio_id", negocioId)
        .eq("usuario_id", auth.userId)
        .single();

      if (fetchError || !imagen) {
        return errorResponse("Imagen no encontrada", 404);
      }

      const objectKey = imagen.url.replace(
        `${MINIO_ENDPOINT.replace(/\/$/, "")}/${MINIO_BUCKET}/`,
        "",
      );
      await eliminarDeMinIO(objectKey);

      const { error: deleteError } = await supabaseAdmin
        .from("negocio_imagenes")
        .delete()
        .eq("id", imagenId)
        .eq("negocio_id", negocioId)
        .eq("usuario_id", auth.userId);

      if (deleteError)
        throw new Error("Error eliminando imagen: " + deleteError.message);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("Error en delete-imagen:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
