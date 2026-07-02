// Signiit — Constantes globales

// ── Planes ─────────────────────────────────────────
export const PLANES = {
  free: {
    id: "free",
    nombre: "Free",
    precio: 0,
    moneda: "PEN",
    negocios: 1,
    generacionesTotal: 1,
    imagenesRenuevan: false,
    videos: 0,
    analisis: 0,
  },
  vip: {
    id: "vip",
    nombre: "VIP",
    precio: 99,
    moneda: "PEN",
    negocios: 1,
    generacionesTotal: 36,
    imagenesRenuevan: true,
    videos: 0,
    analisis: 6,
  },
};

// ── Awareness levels ────────────────────────────────
export const AWARENESS_LEVELS = [
  "solution_aware",
  "product_aware",
  "most_aware",
];

// ── Tono de marca ────────────────────────────────────
export const TONOS_MARCA = [
  { id: "profesional", label: "Profesional" },
  { id: "cercano", label: "Cercano" },
  { id: "urgente", label: "Urgente" },
  { id: "aspiracional", label: "Aspiracional" },
];

// ── Polling ──────────────────────────────────────────
export const POLLING_INTERVAL_MS = 3000; // cada 3s
export const POLLING_TIMEOUT_MS = 480000; // 8 minutos máximo
export const FETCH_TIMEOUT_MS = 120000; // 2 minutos por request

// ── Supabase tabla principal ─────────────────────────
export const TABLA_CAMPANAS = "campanas_generadas";

export const WHATSAPP_NUMERO = "51965797953";
