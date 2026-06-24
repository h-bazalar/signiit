import { verificarAuth } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";

// Crea una preferencia de Checkout Pro para activar el plan VIP (pago único).
// Devuelve init_point — la URL a la que el frontend redirige al usuario.
// El external_reference lleva el clerk_id: así el webhook sabe a quién activar.

const PRECIO_VIP = 99; // PEN. Fuente de verdad del monto (el webhook valida contra esto).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await verificarAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[MP] MP_ACCESS_TOKEN no configurado");
    return res.status(500).json({ error: "Pago no disponible por ahora." });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    // Email del usuario para precargar el checkout (mejor UX; no es obligatorio).
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("email")
      .eq("clerk_id", auth.userId)
      .single();

    const preferencia = {
      items: [
        {
          id: "signiit-vip-mensual",
          title: "Signiit VIP — 1 mes",
          description: "Plan VIP: 36 generaciones y 6 análisis por mes.",
          category_id: "services",
          quantity: 1,
          currency_id: "PEN",
          unit_price: PRECIO_VIP,
        },
      ],
      // Clave del modelo: el clerk_id viaja en external_reference → el webhook
      // lo lee del pago para saber a quién activar. NO confiar en otra cosa.
      external_reference: auth.userId,
      payer: usuario?.email ? { email: usuario.email } : undefined,
      back_urls: {
        success: "https://app.signiit.com/pago-exitoso",
        pending: "https://app.signiit.com/pago-pendiente",
        failure: "https://app.signiit.com/pago-fallido",
      },
      auto_return: "approved",
      // Solo medios instantáneos: se excluyen los offline/lentos (efectivo y
      // transferencia) que dejarían al usuario pagando sin VIP inmediato.
      // Quedan: crédito, débito, Yape y saldo MP.
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
        installments: 1,
      },
      notification_url: "https://app.signiit.com/api/webhook-mp",
      statement_descriptor: "SIGNIIT",
    };

    const mpRes = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preferencia),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!mpRes.ok) {
      const errorText = await mpRes.text();
      console.error("[MP] Error creando preferencia:", mpRes.status, errorText);
      return res
        .status(502)
        .json({ error: "No se pudo iniciar el pago. Intenta de nuevo." });
    }

    const pref = await mpRes.json();
    if (!pref.init_point) {
      console.error("[MP] Preferencia sin init_point:", JSON.stringify(pref));
      return res
        .status(502)
        .json({ error: "No se pudo iniciar el pago. Intenta de nuevo." });
    }

    return res.status(200).json({ initPoint: pref.init_point });
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res
        .status(504)
        .json({ error: "El pago tardó en responder. Intenta de nuevo." });
    }
    console.error("[MP] Error:", err);
    return res.status(500).json({ error: "Error iniciando el pago." });
  }
}
