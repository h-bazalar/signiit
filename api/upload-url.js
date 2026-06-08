import { verificarAuth, jsonResponse, errorResponse } from "./middleware.js";

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

async function generarPresignedUrl({
  objectKey,
  contentType,
  expiresIn = 300,
}) {
  const endpoint = MINIO_ENDPOINT.replace(/\/$/, "");
  const host = new URL(endpoint).host;

  const now = new Date();
  const amzDate =
    now
      .toISOString()
      .replace(/[:-]|\.\d{3}/g, "")
      .slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const region = "us-east-1";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${MINIO_ACCESS_KEY}/${credentialScope}`;

  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=content-type%3Bhost`,
  ].join("&");

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = "content-type;host";

  const canonicalRequest = [
    "PUT",
    `/${MINIO_BUCKET}/${objectKey}`,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

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

  const presignedUrl =
    `${endpoint}/${MINIO_BUCKET}/${objectKey}` +
    `?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  const finalUrl = `${endpoint}/${MINIO_BUCKET}/${objectKey}`;

  return { presignedUrl, finalUrl };
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const body = await req.json();
    const { tipo, negocioId, imagenId, contentType, nombre } = body;

    if (!tipo || !["logo", "imagen_referencia"].includes(tipo)) {
      return errorResponse("tipo debe ser 'logo' o 'imagen_referencia'", 400);
    }
    if (!negocioId) return errorResponse("negocioId requerido", 400);
    if (
      !contentType ||
      !["image/jpeg", "image/png", "image/webp"].includes(contentType)
    ) {
      return errorResponse("contentType inválido", 400);
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

    const { presignedUrl, finalUrl } = await generarPresignedUrl({
      objectKey,
      contentType,
    });

    return jsonResponse({
      presignedUrl,
      finalUrl,
      objectKey,
      tipo,
      negocioId,
      imagenId: imagenId || null,
      nombre: nombre || null,
    });
  } catch (err) {
    console.error("Error en upload-url:", err);
    return errorResponse(err.message || "Error interno", 500);
  }
}
