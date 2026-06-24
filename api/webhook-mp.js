import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Webhook de MercadoPago. PÚBLICO (lo llama MP, no el usuario) → NO usa
// verificarAuth. La autenticidad se garantiza validando la firma x-signature.
//
// Flujo seguro:
//  1. Validar firma HMAC (x-signature) → descarta notificaciones falsas.
//  2. Idempotencia: si el payment_id ya se procesó, cortar (MP reintenta).
//  3. Consultar el pago REAL en la API de MP (nunca confiar en el body).
//  4. Solo si status==='approved' y el monto cuadra → activar VIP.
//
// Responder SIEMPRE 200 salvo: firma inválida (401) o error real (500, para
// que MP reintente). Un pago pendiente/rechazado se ackea con 200 sin activar.

const PRECIO_VIP = 99; // PEN — debe coincidir con crear-preferencia-mp.js
const DIAS_VIP = 30;

// Lee un header tolerando ambos estilos (Node object / Web API).
const getHeader = (req, name) =>
  req.headers.get ? req.headers.get(name) : req.headers[name];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!secret || !accessToken) {
    console.error("[MP-WH] Faltan MP_WEBHOOK_SECRET o MP_ACCESS_TOKEN");
    return res.status(500).json({ error: "Webhook no configurado" });
  }

  // ── data.id y type: vienen en el query string (?data.id=...&type=payment).
  //    Fallback al body por si acaso. ──
  const dataId =
    (req.query && req.query["data.id"]) || req.body?.data?.id || null;
  const tipo = (req.query && req.query.type) || req.body?.type || null;

  // Solo nos interesan notificaciones de pago. El resto se ackea y se ignora.
  if (tipo !== "payment") {
    return res.status(200).json({ ignored: true });
  }
  if (!dataId) {
    console.error("[MP-WH] Notificación payment sin data.id");
    return res.status(200).json({ ignored: true });
  }

  // ── 1) VALIDACIÓN DE FIRMA ──
  // x-signature: "ts=<timestamp>,v1=<hash>". Manifest:
  //   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  // HMAC-SHA256(secret, manifest) en hex debe igualar v1.
  const xSignature = getHeader(req, "x-signature") || "";
  const xRequestId = getHeader(req, "x-request-id") || "";

  let ts = null;
  let hash = null;
  xSignature.split(",").forEach((part) => {
    const [k, v] = part.split("=");
    if (!k || !v) return;
    const key = k.trim();
    const val = v.trim();
    if (key === "ts") ts = val;
    else if (key === "v1") hash = val;
  });

  if (!ts || !hash) {
    console.error("[MP-WH] x-signature ausente o mal formado");
    return res.status(401).json({ error: "Firma inválida" });
  }

  // data.id en minúsculas si fuera alfanumérico (regla de MP; en numéricos es no-op).
  const idParaManifest = String(dataId).toLowerCase();
  // Solo incluir request-id si llegó (regla de MP: omitir lo ausente).
  const manifest = xRequestId
    ? `id:${idParaManifest};request-id:${xRequestId};ts:${ts};`
    : `id:${idParaManifest};ts:${ts};`;

  const firmaCalculada = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Comparación en tiempo constante (evita timing attacks). Distinto largo = falsa.
  const a = Buffer.from(firmaCalculada, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.error("[MP-WH] Firma no coincide. Notificación rechazada.");
    return res.status(401).json({ error: "Firma inválida" });
  }

  // ── A partir de acá la notificación es auténtica ──
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  try {
    // ── 2) IDEMPOTENCIA: ¿ya procesamos este pago? ──
    const { data: yaProcesado } = await supabaseAdmin
      .from("pagos_procesados")
      .select("payment_id")
      .eq("payment_id", String(dataId))
      .maybeSingle();

    if (yaProcesado) {
      return res.status(200).json({ status: "ya_procesado" });
    }

    // ── 3) CONSULTAR EL PAGO REAL EN MP (no confiar en el body) ──
    const pagoRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${dataId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!pagoRes.ok) {
      // Error consultando MP → 500 para que reintente más tarde.
      const t = await pagoRes.text();
      console.error("[MP-WH] Error consultando pago:", pagoRes.status, t);
      return res.status(500).json({ error: "No se pudo verificar el pago" });
    }

    const pago = await pagoRes.json();

    // ── 4) Validar estado, monto y referencia ──
    if (pago.status !== "approved") {
      // Pendiente/rechazado: ack sin activar. NO lo registramos (puede aprobarse luego).
      return res.status(200).json({ status: pago.status });
    }

    const clerkId = pago.external_reference;
    const monto = Number(pago.transaction_amount);

    if (!clerkId) {
      console.error("[MP-WH] Pago aprobado sin external_reference:", dataId);
      return res.status(200).json({ status: "sin_referencia" });
    }
    if (!Number.isFinite(monto) || monto < PRECIO_VIP) {
      console.error(
        `[MP-WH] Monto insuficiente (${monto}) para pago ${dataId}. No se activa.`,
      );
      return res.status(200).json({ status: "monto_invalido" });
    }

    // ── 5) ACTIVAR VIP (mismo update del modelo: plan + créditos frescos + ventana) ──
    const ahora = new Date();
    const expira = new Date(ahora.getTime() + DIAS_VIP * 864e5);

    const { error: updError } = await supabaseAdmin
      .from("usuarios")
      .update({
        plan: "vip",
        creditos_reset_at: ahora.toISOString(),
        vip_expires_at: expira.toISOString(),
        generaciones_estaticos: 0,
        generaciones_video: 0,
        analisis_realizados: 0,
      })
      .eq("clerk_id", clerkId);

    if (updError) {
      console.error("[MP-WH] Error activando VIP:", updError.message);
      return res.status(500).json({ error: "No se pudo activar el plan" });
    }

    // ── 6) Registrar el pago (cierra la idempotencia para futuros reintentos) ──
    const { error: insError } = await supabaseAdmin
      .from("pagos_procesados")
      .insert({
        payment_id: String(dataId),
        clerk_id: clerkId,
        monto,
      });

    // Si choca por PK (otra notificación corrió en paralelo), no es error real.
    if (insError && insError.code !== "23505") {
      console.error(
        "[MP-WH] VIP activado pero fallo al registrar pago:",
        insError.message,
      );
      // El VIP ya quedó activo; respondemos 200 igual para no reintentar.
    }

    console.log(
      `✅ [MP-WH] VIP activado · ${clerkId} · pago ${dataId} · S/${monto}`,
    );
    return res.status(200).json({ status: "vip_activado" });
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(500).json({ error: "Timeout verificando el pago" });
    }
    console.error("[MP-WH] Error:", err);
    return res.status(500).json({ error: "Error procesando la notificación" });
  }
}
