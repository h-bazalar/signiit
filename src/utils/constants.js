// Signiit — Constantes globales

// ── Planes ─────────────────────────────────────────
export const PLANES = {
  free: {
    id: 'free',
    nombre: 'Free',
    precio: 0,
    moneda: 'PEN',
    negocios: 1,
    imagenesTotal: 3,
    imagenesRenuevan: false,
    videos: 0,
    analisis: 0,
  },
  vip: {
    id: 'vip',
    nombre: 'VIP',
    precio: 99,
    moneda: 'PEN',
    negocios: 1,
    imagenesTotal: 36,
    imagenesRenuevan: true,
    videos: 0,
    analisis: 5,
  },
}

// ── Créditos ────────────────────────────────────────
export const CREDITO_TIPOS = {
  imagenes: 'generaciones_estaticos',  // 1 crédito = 6 imágenes
  videos:   'generaciones_video',      // 1 crédito = 3 videos
  analisis: 'analisis_realizados',     // 1 crédito = 1 análisis
}

// ── Output por generación ───────────────────────────
export const OUTPUT = {
  imagenesPorGeneracion: 6,   // 2 por cada awareness level
  videosPorGeneracion:   3,   // 1 por cada awareness level
  titulosPorImagen:      5,
  copiesPorImagen:       5,
  duracionVideoSeg:      15,
}

// ── Awareness levels ────────────────────────────────
export const AWARENESS_LEVELS = ['solution_aware', 'product_aware', 'most_aware']

// ── Tono de marca ────────────────────────────────────
export const TONOS_MARCA = [
  { id: 'profesional',  label: 'Profesional' },
  { id: 'cercano',      label: 'Cercano' },
  { id: 'urgente',      label: 'Urgente' },
  { id: 'aspiracional', label: 'Aspiracional' },
]

// ── Polling ──────────────────────────────────────────
export const POLLING_INTERVAL_MS   = 3000    // cada 3s
export const POLLING_TIMEOUT_MS    = 480000  // 8 minutos máximo
export const FETCH_TIMEOUT_MS      = 120000  // 2 minutos por request

// ── Supabase tabla principal ─────────────────────────
export const TABLA_CAMPANAS = 'campanas_generadas'
