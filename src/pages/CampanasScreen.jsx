import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useToast } from "../context/ToastContext";
import { useCreditos } from "../hooks/useCreditos";
import {
  PLANES,
  POLLING_INTERVAL_MS,
  POLLING_TIMEOUT_MS,
} from "../utils/constants";

// ── Iconos ────────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect
      x="4"
      y="4"
      width="8"
      height="8"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.1"
    />
    <path
      d="M2 9H1.5A1.5 1.5 0 010 7.5v-6A1.5 1.5 0 011.5 0h6A1.5 1.5 0 019 1.5V2"
      stroke="currentColor"
      strokeWidth="1.1"
    />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <line
      x1="2"
      y1="2"
      x2="12"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="2"
      x2="2"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect
      x="2"
      y="5"
      width="8"
      height="6"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M4 5V3.5a2 2 0 014 0V5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M6.5 1v8M3.5 6.5l3 3 3-3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1 10.5h11"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

// ── Labels de awareness ───────────────────────────────────────────────────────
const AWARENESS_LABELS = {
  solution_aware: {
    label: "Atrae nuevos clientes",
    color: "var(--sig-aware-green)",
    text: "var(--sig-aware-green-text)",
    border: "var(--sig-aware-green-border)",
  },
  product_aware: {
    label: "Convence al interesado",
    color: "var(--sig-aware-blue)",
    text: "var(--sig-aware-blue-text)",
    border: "var(--sig-aware-blue-border)",
  },
  most_aware: {
    label: "Cierra al decidido",
    color: "var(--sig-aware-amber)",
    text: "var(--sig-aware-amber-text)",
    border: "var(--sig-aware-amber-border)",
  },
};

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!value);
        }
      }}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: value ? "var(--sig-mid)" : "var(--sig-line-s)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

// ── Barra de progreso circular ────────────────────────────────────────────────
function ProgresoCircular({ progreso, tipo }) {
  const r = 42;
  const circunferencia = 2 * Math.PI * r;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "40px 0",
      }}
    >
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--sig-line)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--sig-mid)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - progreso / 100)}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--sig-mid)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {Math.round(progreso)}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--sig-forest)",
            marginBottom: 6,
          }}
        >
          {tipo === "video"
            ? "Generando Video Ads..."
            : "Generando creativos..."}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "var(--sig-stone)",
            lineHeight: 1.6,
          }}
        >
          {tipo === "video"
            ? "La IA está construyendo tus 3 Video Ads. Toma aprox. 2-3 minutos."
            : "La IA está generando imágenes y copies para cada nivel. Toma aprox. 1-2 minutos."}
        </p>
      </div>
    </div>
  );
}

// ── Card de resultado — imagen ────────────────────────────────────────────────
function CardImagen({ variacion, onCopy, onExpandir }) {
  const aw = AWARENESS_LABELS[variacion.awareness_level] || {
    label: "Creativo",
    color: "var(--sig-aware-green)",
    text: "var(--sig-aware-green-text)",
    border: "var(--sig-aware-green-border)",
  };

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header awareness */}
      <div
        style={{
          background: aw.color,
          padding: "10px 16px",
          borderBottom: `1px solid ${aw.border}33`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: aw.border,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: aw.text,
            fontWeight: 700,
          }}
        >
          {aw.label}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {/* Imagen */}
        <div style={{ flex: "0 0 180px", padding: "16px" }}>
          <img
            src={variacion.foto}
            alt={`Creativo ${aw.label}`}
            onClick={() => onExpandir(variacion.foto)}
            style={{
              width: "100%",
              aspectRatio: "1/1",
              objectFit: "cover",
              borderRadius: "8px",
              border: "0.5px solid var(--sig-line)",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          />
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              color: "var(--sig-stone)",
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Clic para ampliar
          </p>
        </div>

        {/* Títulos */}
        <div
          style={{
            flex: "1 1 200px",
            padding: "16px",
            borderLeft: "0.5px solid var(--sig-line)",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sig-stone)",
              marginBottom: 10,
            }}
          >
            5 Títulos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(variacion.titulos || []).map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "var(--sig-paper)",
                  borderRadius: 6,
                  padding: "7px 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "var(--sig-forest)",
                    lineHeight: 1.4,
                  }}
                >
                  {t}
                </span>
                <button
                  onClick={() => onCopy(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sig-stone)",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  <IconCopy />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Copies */}
        <div
          style={{
            flex: "1 1 220px",
            padding: "16px",
            borderLeft: "0.5px solid var(--sig-line)",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sig-stone)",
              marginBottom: 10,
            }}
          >
            5 Copies
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(variacion.copies || []).map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "var(--sig-paper)",
                  borderRadius: 6,
                  padding: "7px 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "var(--sig-forest)",
                    lineHeight: 1.4,
                  }}
                >
                  {c}
                </span>
                <button
                  onClick={() => onCopy(c)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sig-stone)",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  <IconCopy />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card de resultado — video ─────────────────────────────────────────────────
function CardVideo({ variacion, onCopy }) {
  const aw = AWARENESS_LABELS[variacion.awareness_level] || {
    label: "Video Ad",
    color: "var(--sig-aware-green)",
    text: "var(--sig-aware-green-text)",
    border: "var(--sig-aware-green-border)",
  };

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: aw.color,
          padding: "10px 16px",
          borderBottom: `1px solid ${aw.border}33`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: aw.border,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: aw.text,
            fontWeight: 700,
          }}
        >
          {aw.label}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {/* Video */}
        <div style={{ flex: "0 0 220px", padding: "16px" }}>
          <video
            controls
            style={{
              width: "100%",
              borderRadius: 8,
              border: "0.5px solid var(--sig-line)",
              background: "#000",
            }}
            src={variacion.video}
          >
            Tu navegador no soporta video.
          </video>
          <a
            href={variacion.video}
            download
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 7,
              background: "var(--sig-forest)",
              color: "var(--sig-warm)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <IconDownload /> Descargar video
          </a>
        </div>

        {/* Títulos */}
        <div
          style={{
            flex: "1 1 200px",
            padding: "16px",
            borderLeft: "0.5px solid var(--sig-line)",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sig-stone)",
              marginBottom: 10,
            }}
          >
            5 Títulos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(variacion.titulos || []).map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "var(--sig-paper)",
                  borderRadius: 6,
                  padding: "7px 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "var(--sig-forest)",
                    lineHeight: 1.4,
                  }}
                >
                  {t}
                </span>
                <button
                  onClick={() => onCopy(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sig-stone)",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  <IconCopy />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Copies */}
        <div
          style={{
            flex: "1 1 220px",
            padding: "16px",
            borderLeft: "0.5px solid var(--sig-line)",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sig-stone)",
              marginBottom: 10,
            }}
          >
            5 Copies
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(variacion.copies || []).map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "var(--sig-paper)",
                  borderRadius: 6,
                  padding: "7px 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "var(--sig-forest)",
                    lineHeight: 1.4,
                  }}
                >
                  {c}
                </span>
                <button
                  onClick={() => onCopy(c)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sig-stone)",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  <IconCopy />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal imagen expandida ────────────────────────────────────────────────────
function ModalImagen({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconClose />
      </button>
      <img
        src={src}
        alt="Creativo ampliado"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 12,
        }}
      />
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function CampanasScreen({ supabase, planActual }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { addToast } = useToast();
  const {
    creditos,
    tieneCredito,
    refetch: refetchCreditos,
  } = useCreditos(supabase);
  const plan = PLANES[planActual] || PLANES.free;

  // Negocios
  const [negocios, setNegocios] = useState([]);
  const [cargandoNegocios, setCargandoNegocios] = useState(true);
  const [negocioId, setNegocioId] = useState("");

  // Formulario ángulo (Bloque 2)
  const [angulo, setAngulo] = useState({
    promocionar: "",
    problema: "",
    diferencial: "",
    destino: "meta_ads", // 'meta_ads' | '9_16' | 'ambos'
    ofertaActiva: false,
    ofertaDetalle: "",
    ofertaPrecio: "",
  });

  // Tipo de generación
  const [tipoGeneracion, setTipoGeneracion] = useState("imagenes"); // 'imagenes' | 'video' | 'ambos'

  // Estado de generación
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(null); // { tipo, variaciones }
  const [errorGen, setErrorGen] = useState(null);

  // Modal imagen expandida
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // Refs para cleanup
  const pollingRef = useRef(null);
  const progresoRef = useRef(null);
  const abortRef = useRef(null);

  const videoDisponible = planActual !== "free";

  // ── Cargar negocios ──
  const cargarNegocios = async () => {
    if (!user) return;
    setCargandoNegocios(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const { createSupabaseClient } = await import('../supabase.js');
      const client = createSupabaseClient(token);
      const { data } = await client
        .from('negocios')
        .select('id, nombre, rubro')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });
      if (data?.length) {
        setNegocios(data);
        setNegocioId(data[0].id);
      }
    } catch (e) {
      console.error('Error cargando negocios:', e);
    } finally {
      setCargandoNegocios(false);
    }
  };

  useEffect(() => {
    cargarNegocios();
  }, [user]);

  // ── Cleanup al desmontar ──
  useEffect(() => {
    return () => {
      clearInterval(pollingRef.current);
      clearInterval(progresoRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Copiar al portapapeles ──
  const handleCopy = async (texto) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "absolute";
        ta.style.left = "-999999px";
        document.body.prepend(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      addToast("Copiado al portapapeles.", "success");
    } catch {
      addToast("No se pudo copiar.", "error");
    }
  };

  // ── Iniciar barra de progreso ──
  const iniciarProgreso = () => {
    setProgreso(0);
    clearInterval(progresoRef.current);
    progresoRef.current = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 88) {
          clearInterval(progresoRef.current);
          return 88;
        }
        return prev + Math.random() * 0.5 + 0.2;
      });
    }, 1000);
  };

  // ── Polling a Supabase ──
  const iniciarPolling = useCallback(
    (campanaId, tipo) => {
      const inicio = Date.now();
      return new Promise((resolve, reject) => {
        pollingRef.current = setInterval(async () => {
          if (Date.now() - inicio > POLLING_TIMEOUT_MS) {
            clearInterval(pollingRef.current);
            reject(new Error("Tiempo de espera agotado. Intenta de nuevo."));
            return;
          }
          try {
            const { data } = await supabase
              .from("campanas_generadas")
              .select("estado, resultado")
              .eq("id", campanaId)
              .single();

            if (!data) return;

            if (data.estado === "error") {
              clearInterval(pollingRef.current);
              reject(
                new Error(
                  data.resultado?.mensaje ||
                    "Error al generar. Intenta de nuevo.",
                ),
              );
              return;
            }

            if (data.estado === "listo" && data.resultado) {
              clearInterval(pollingRef.current);
              resolve({ tipo, variaciones: data.resultado.variaciones || [] });
            }
          } catch (e) {
            console.error("Error polling:", e);
          }
        }, POLLING_INTERVAL_MS);
      });
    },
    [supabase],
  );

  // ── Validar formulario ──
  const validarAngulo = () => {
    if (!negocioId) return "Selecciona un negocio";
    if (!angulo.promocionar.trim()) return "Indica qué quieres promocionar";
    if (!angulo.problema.trim())
      return "Indica qué problema resuelves o deseo activas";
    if (!angulo.diferencial.trim())
      return "Indica tu diferencial para esta campaña";
    if (angulo.ofertaActiva && !angulo.ofertaDetalle.trim())
      return "Describe la oferta activa";
    return null;
  };

  // ── Generar ──
  const handleGenerar = async () => {
    const error = validarAngulo();
    if (error) {
      addToast(error, "error");
      return;
    }

    if (tipoGeneracion === "imagenes" && !tieneCredito.imagenes) {
      addToast("Sin créditos de imágenes disponibles.", "error");
      return;
    }
    if (tipoGeneracion === "video" && !tieneCredito.videos) {
      addToast("Sin créditos de video disponibles.", "error");
      return;
    }

    setGenerando(true);
    setResultado(null);
    setErrorGen(null);
    iniciarProgreso();

    try {
      const endpoint =
        tipoGeneracion === "video"
          ? "/api/generar-videos"
          : "/api/generar-imagen";
      abortRef.current = new AbortController();

      const token = await getToken();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ negocioId, angulo }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      const { campanaId } = await res.json();

      if (!campanaId) throw new Error("No se recibió ID de campaña");

      // Polling hasta que n8n termine
      const resultado = await iniciarPolling(campanaId, tipoGeneracion);

      clearInterval(progresoRef.current);
      setProgreso(100);
      setTimeout(() => setProgreso(0), 800);

      setResultado(resultado);
      addToast("¡Creativos generados con éxito!", "success");

      // Actualizar créditos en UI
      await refetchCreditos();
    } catch (err) {
      if (err.name === "AbortError") return; // cancelado por usuario
      console.error("Error generando:", err);
      setErrorGen(err.message || "Ocurrió un error. Intenta de nuevo.");
      addToast(err.message || "Error al generar. Intenta de nuevo.", "error");
    } finally {
      clearInterval(progresoRef.current);
      clearInterval(pollingRef.current);
      setGenerando(false);
    }
  };

  // ── Cancelar ──
  const handleCancelar = () => {
    clearInterval(progresoRef.current);
    clearInterval(pollingRef.current);
    if (abortRef.current) abortRef.current.abort();
    setGenerando(false);
    setProgreso(0);
    addToast("Generación cancelada.", "info");
  };

  const setA = (campo, valor) => setAngulo((a) => ({ ...a, [campo]: valor }));

  const inputStyle = {
    width: "100%",
    background: "white",
    border: "0.5px solid var(--sig-line-s)",
    borderRadius: "7px",
    padding: "9px 12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    color: "var(--sig-forest)",
    outline: "none",
    transition: "border-color 0.15s",
    resize: "none",
  };

  const negocioSeleccionado = negocios.find((n) => n.id === negocioId);

  // ── Render ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--sig-paper)" }}>
      <div
        style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 24px" }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--sig-stone)",
              marginBottom: 6,
            }}
          >
            Generar creativos
          </p>
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "26px",
              color: "var(--sig-forest)",
              lineHeight: 1.1,
            }}
          >
            Nueva campaña
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "var(--sig-stone)",
              marginTop: 6,
            }}
          >
            Creativos diseñados para cada momento del proceso de compra.
          </p>
        </div>

        {/* Sin negocios */}
        {!cargandoNegocios && negocios.length === 0 && (
          <div
            style={{
              background: "var(--sig-aware-amber)",
              border: "0.5px solid var(--sig-aware-amber-border)",
              borderRadius: "10px",
              padding: "16px 20px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "var(--sig-aware-amber-text)",
            }}
          >
            Primero debes registrar un negocio en la sección{" "}
            <strong>Mis negocios</strong> para poder generar creativos.
          </div>
        )}

        {negocios.length > 0 && (
          <>
            {/* ── Formulario de campaña ── */}
            <div
              style={{
                background: "white",
                border: "0.5px solid var(--sig-line)",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "16px",
              }}
            >
              {/* Selector de negocio */}
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 8,
                  }}
                >
                  Negocio
                </p>
                {negocios.length === 1 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "var(--sig-aware-green)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      border: "0.5px solid var(--sig-aware-green-border)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--sig-mid)",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--sig-forest)",
                        }}
                      >
                        {negocios[0].nombre}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "9px",
                          color: "var(--sig-stone)",
                          marginLeft: 8,
                        }}
                      >
                        {negocios[0].rubro}
                      </span>
                    </div>
                  </div>
                ) : (
                  <select
                    value={negocioId}
                    onChange={(e) => setNegocioId(e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      cursor: "pointer",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--sig-mid)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--sig-line-s)")
                    }
                  >
                    {negocios.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre} — {n.rubro}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                style={{
                  height: "0.5px",
                  background: "var(--sig-line)",
                  margin: "0 0 20px",
                }}
              />

              {/* Bloque 2 — Ángulo de campaña */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--sig-forest)",
                    color: "var(--sig-mint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--sig-forest)",
                    }}
                  >
                    Ángulo de esta campaña
                  </p>
                  <p
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      letterSpacing: "0.08em",
                      color: "var(--sig-stone)",
                    }}
                  >
                    Define el foco — se aplica a esta generación únicamente
                  </p>
                </div>
              </div>

              {/* Qué promocionar */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 6,
                  }}
                >
                  Qué quieres promocionar
                </p>
                <textarea
                  rows={2}
                  style={inputStyle}
                  placeholder="Ej: El batido Fuxión Energy para personas con cansancio crónico. / Cheesecake de maracuyá para pedidos este fin de semana."
                  value={angulo.promocionar}
                  onChange={(e) => setA("promocionar", e.target.value)}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--sig-mid)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--sig-line-s)")
                  }
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "var(--sig-stone)",
                    marginTop: 4,
                  }}
                >
                  Sé específico. Esto es el núcleo de todos los creativos de
                  esta generación.
                </p>
              </div>

              {/* Problema / deseo */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 6,
                  }}
                >
                  Qué problema resuelve o deseo activa
                </p>
                <textarea
                  rows={2}
                  style={inputStyle}
                  placeholder="Ej: Me canso todo el día y no rindo en el trabajo. / Quiero regalar algo rico y que se vea bonito sin gastar de más."
                  value={angulo.problema}
                  onChange={(e) => setA("problema", e.target.value)}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--sig-mid)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--sig-line-s)")
                  }
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "var(--sig-stone)",
                    marginTop: 4,
                  }}
                >
                  El gancho del creativo nace aquí. Cuanto más específico, más
                  poderoso el hook.
                </p>
              </div>

              {/* Diferencial campaña */}
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 6,
                  }}
                >
                  Por qué elegirte para esto
                </p>
                <textarea
                  rows={2}
                  style={inputStyle}
                  placeholder="Ej: Entrega a domicilio el mismo día. / Ingredientes naturales sin azúcar. / Descuento de lanzamiento esta semana."
                  value={angulo.diferencial}
                  onChange={(e) => setA("diferencial", e.target.value)}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--sig-mid)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--sig-line-s)")
                  }
                />
              </div>

              {/* Oferta activa */}
              <div
                style={{
                  marginBottom: 20,
                  background: "var(--sig-paper)",
                  borderRadius: 8,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: angulo.ofertaActiva ? 14 : 0,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--sig-forest)",
                      }}
                    >
                      ¿Hay una oferta activa?
                    </p>
                    <p
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "9px",
                        color: "var(--sig-stone)",
                        marginTop: 2,
                      }}
                    >
                      Descuento, precio especial, vigencia limitada
                    </p>
                  </div>
                  <Toggle
                    value={angulo.ofertaActiva}
                    onChange={(v) => setA("ofertaActiva", v)}
                  />
                </div>
                {angulo.ofertaActiva && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px" }}>
                      <p
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--sig-stone)",
                          marginBottom: 5,
                        }}
                      >
                        Descripción de la oferta
                      </p>
                      <input
                        style={{ ...inputStyle, background: "white" }}
                        placeholder="Ej: 20% de descuento esta semana"
                        value={angulo.ofertaDetalle}
                        onChange={(e) =>
                          setA("ofertaDetalle", e.target.value.slice(0, 80))
                        }
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--sig-mid)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--sig-line-s)")
                        }
                      />
                    </div>
                    <div style={{ flex: "0 0 140px" }}>
                      <p
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--sig-stone)",
                          marginBottom: 5,
                        }}
                      >
                        Precio (opcional)
                      </p>
                      <input
                        style={{ ...inputStyle, background: "white" }}
                        placeholder="Ej: S/25"
                        value={angulo.ofertaPrecio}
                        onChange={(e) =>
                          setA("ofertaPrecio", e.target.value.slice(0, 20))
                        }
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--sig-mid)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--sig-line-s)")
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Destino */}
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 10,
                  }}
                >
                  ¿Dónde vas a publicar?
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      id: "meta_ads",
                      label: "Meta Ads",
                      sub: "Feed · 1:1 / 4:5",
                    },
                    {
                      id: "9_16",
                      label: "Stories / Reels / WhatsApp",
                      sub: "Vertical · 9:16",
                    },
                    {
                      id: "ambos",
                      label: "Ambos formatos",
                      sub: "Genera versiones para cada uno",
                    },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setA("destino", d.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        background:
                          angulo.destino === d.id
                            ? "var(--sig-forest)"
                            : "var(--sig-paper)",
                        border:
                          angulo.destino === d.id
                            ? "0.5px solid var(--sig-forest)"
                            : "0.5px solid var(--sig-line-s)",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          fontWeight: 500,
                          color:
                            angulo.destino === d.id
                              ? "var(--sig-mint)"
                              : "var(--sig-forest)",
                          marginBottom: 2,
                        }}
                      >
                        {d.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "8px",
                          color:
                            angulo.destino === d.id
                              ? "rgba(240,237,230,0.5)"
                              : "var(--sig-stone)",
                        }}
                      >
                        {d.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de generación */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sig-stone)",
                    marginBottom: 10,
                  }}
                >
                  ¿Qué quieres generar?
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      id: "imagenes",
                      label: "Imágenes",
                      sub: `6 creativos · ${creditos ? (planActual !== "free" ? `${PLANES[planActual].imagenesTotal - creditos.imagenes} restantes` : `${PLANES.free.imagenesTotal - creditos.imagenes} restantes`) : "—"}`,
                    },
                    {
                      id: "video",
                      label: "Video Ads",
                      sub: videoDisponible
                        ? `3 videos · ${creditos ? `${PLANES[planActual]?.videos - creditos.videos} restantes` : "—"}`
                        : "Requiere plan Básico",
                      bloqueado: !videoDisponible,
                    },
                    {
                      id: "ambos",
                      label: "Imágenes + Video",
                      sub: "Genera ambos en una sesión",
                      bloqueado: !videoDisponible,
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => !t.bloqueado && setTipoGeneracion(t.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: t.bloqueado ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        position: "relative",
                        background:
                          tipoGeneracion === t.id && !t.bloqueado
                            ? "var(--sig-forest)"
                            : "var(--sig-paper)",
                        border:
                          tipoGeneracion === t.id && !t.bloqueado
                            ? "0.5px solid var(--sig-forest)"
                            : "0.5px solid var(--sig-line-s)",
                        opacity: t.bloqueado ? 0.6 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "12px",
                            fontWeight: 500,
                            color:
                              tipoGeneracion === t.id && !t.bloqueado
                                ? "var(--sig-mint)"
                                : "var(--sig-forest)",
                            marginBottom: 2,
                          }}
                        >
                          {t.label}
                        </p>
                        {t.bloqueado && <IconLock />}
                      </div>
                      <p
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "8px",
                          color:
                            tipoGeneracion === t.id && !t.bloqueado
                              ? "rgba(240,237,230,0.5)"
                              : "var(--sig-stone)",
                        }}
                      >
                        {t.sub}
                      </p>
                    </button>
                  ))}
                </div>
                {!videoDisponible && (
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      color: "var(--sig-stone)",
                      marginTop: 8,
                    }}
                  >
                    Video Ads disponible desde el plan Básico.{" "}
                    <span
                      style={{ color: "var(--sig-mid)", cursor: "pointer" }}
                    >
                      Ver planes →
                    </span>
                  </p>
                )}
              </div>

              {/* Botón generar */}
              <button
                onClick={handleGenerar}
                disabled={generando}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 8,
                  background: generando
                    ? "var(--sig-signal)"
                    : "var(--sig-forest)",
                  border: "none",
                  color: "var(--sig-warm)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: generando ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {generando
                  ? "Generando..."
                  : `Generar ${tipoGeneracion === "imagenes" ? "imágenes" : tipoGeneracion === "video" ? "Video Ads" : "imágenes y Video Ads"} →`}
              </button>
            </div>

            {/* ── Progreso ── */}
            {generando && (
              <div
                style={{
                  background: "white",
                  border: "0.5px solid var(--sig-line)",
                  borderRadius: "12px",
                  padding: "24px",
                  marginBottom: "16px",
                }}
              >
                <ProgresoCircular progreso={progreso} tipo={tipoGeneracion} />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={handleCancelar}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 7,
                      background: "transparent",
                      border: "0.5px solid #E57373",
                      color: "#C0392B",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar generación
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {errorGen && !generando && (
              <div
                style={{
                  background: "#FFF5F5",
                  border: "0.5px solid #E57373",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "#C0392B",
                  }}
                >
                  {errorGen}
                </p>
                <button
                  onClick={() => setErrorGen(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C0392B",
                    cursor: "pointer",
                  }}
                >
                  <IconClose />
                </button>
              </div>
            )}

            {/* ── Resultados ── */}
            {resultado && !generando && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "18px",
                      color: "var(--sig-forest)",
                    }}
                  >
                    {resultado.tipo === "video"
                      ? "Video Ads generados"
                      : "Imágenes generadas"}
                  </p>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: "var(--sig-aware-green)",
                      color: "var(--sig-aware-green-text)",
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {resultado.variaciones.length} creativos ·{" "}
                    {negocioSeleccionado?.nombre}
                  </span>
                </div>

                {resultado.tipo === "video"
                  ? (resultado.variaciones || []).map((v, i) => (
                      <CardVideo key={i} variacion={v} onCopy={handleCopy} />
                    ))
                  : (resultado.variaciones || []).map((v, i) => (
                      <CardImagen
                        key={i}
                        variacion={v}
                        onCopy={handleCopy}
                        onExpandir={setImagenExpandida}
                      />
                    ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal imagen expandida */}
      {imagenExpandida && (
        <ModalImagen
          src={imagenExpandida}
          onClose={() => setImagenExpandida(null)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
