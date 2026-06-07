import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: "Webhook secret no configurado" });
  }

  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: "Headers de Svix faltantes" });
  }

  const body = JSON.stringify(req.body);

  let event;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return res.status(400).json({ error: "Firma inválida" });
  }

  const { type, data } = event;

  if (type === "user.created") {
    const email = data.email_addresses?.[0]?.email_address || "";
    const nombre = `${data.first_name || ""} ${data.last_name || ""}`.trim();

    const { error } = await supabase.from("usuarios").upsert(
      {
        clerk_id: data.id,
        email,
        nombre,
        plan: "free",
        generaciones_estaticos: 0,
        generaciones_video: 0,
        analisis_realizados: 0,
        creditos_reset_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("Error creando usuario en Supabase:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (type === "user.updated") {
    const nombre = `${data.first_name || ""} ${data.last_name || ""}`.trim();

    const { error } = await supabase
      .from("usuarios")
      .update({ nombre })
      .eq("clerk_id", data.id);

    if (error) {
      console.error("Error actualizando usuario:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(200).json({ ok: true });
}
