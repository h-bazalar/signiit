import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { createSupabaseClient } from "../supabase";
import ImagenConReintento from "../components/ImagenConReintento";
import { useToast } from "../context/ToastContext";
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
const IconChevron = ({ dir = "down" }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: dir === "up" ? "rotate(180deg)" : "none" }}
  >
    <path
      d="M2 4l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAspect = ({ ratio }) => {
  const configs = {
    "1:1": { w: 16, h: 16 },
    "4:5": { w: 14, h: 17 },
    "9:16": { w: 10, h: 18 },
  };
  const c = configs[ratio] || { w: 16, h: 16 };
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect
        x={(20 - c.w) / 2}
        y={(20 - c.h) / 2}
        width={c.w}
        height={c.h}
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
};

// ── Icono señal radar (Meta Ads) ──────────────────────────────────────────────
const IconRadar = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--sig-forest)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

// ── Icono onda orgánico ───────────────────────────────────────────────────────
const IconOnda = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--sig-forest)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// ── Awareness labels ──────────────────────────────────────────────────────────
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

// ── Estilos de gancho orgánico ────────────────────────────────────────────────
const GANCHO_LABELS = {
  pregunta: {
    label: "Una pregunta que conecta",
    color: "var(--sig-aware-blue)",
    text: "var(--sig-aware-blue-text)",
    border: "var(--sig-aware-blue-border)",
  },
  declaracion: {
    label: "Una afirmación directa",
    color: "var(--sig-aware-green)",
    text: "var(--sig-aware-green-text)",
    border: "var(--sig-aware-green-border)",
  },
  cta: {
    label: "Un llamado a actuar",
    color: "var(--sig-aware-amber)",
    text: "var(--sig-aware-amber-text)",
    border: "var(--sig-aware-amber-border)",
  },
};

// ── Pasos del wizard ──────────────────────────────────────────────────────────
const PASOS = ["Qué", "Por qué", "Oferta", "Formato"];

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

// ── Indicador de progreso ─────────────────────────────────────────────────────
function Progreso({ pasoActual }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        {PASOS.map((label, i) => (
          <div
            key={i}
            style={{
              flex: i < PASOS.length - 1 ? 1 : 0,
              display: "flex",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: i === pasoActual ? 10 : 8,
                  height: i === pasoActual ? 10 : 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  background:
                    i < pasoActual
                      ? "var(--sig-mid)"
                      : i === pasoActual
                        ? "var(--sig-forest)"
                        : "rgba(15,74,56,0.15)",
                  boxShadow:
                    i === pasoActual
                      ? "0 0 0 3px rgba(61,171,142,0.2)"
                      : "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                  color:
                    i < pasoActual
                      ? "var(--sig-mid)"
                      : i === pasoActual
                        ? "var(--sig-forest)"
                        : "rgba(15,74,56,0.3)",
                  fontWeight: i === pasoActual ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "0.5px",
                  transition: "background 0.3s",
                  background:
                    i < pasoActual ? "var(--sig-mid)" : "rgba(15,74,56,0.15)",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

// ── Burbuja educativa ─────────────────────────────────────────────────────────
function BurbujaInfo({ colapsada, onToggle, esMobil, modoApp }) {
  const esOrganico = modoApp === "organico";
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid rgba(15,74,56,0.15)",
        borderRadius: esMobil ? "10px" : "12px 12px 2px 12px",
        padding: "18px 18px",
        position: esMobil ? "relative" : "sticky",
        top: esMobil ? "auto" : "24px",
        width: esMobil ? "100%" : "240px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: esMobil ? "pointer" : "default",
          marginBottom: colapsada ? 0 : 10,
        }}
        onClick={esMobil ? onToggle : undefined}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--sig-mid)",
            fontWeight: 700,
          }}
        >
          Cómo funciona
        </span>
        {esMobil && <IconChevron dir={colapsada ? "down" : "up"} />}
      </div>
      {!colapsada && (
        <>
          <p
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "14px",
              color: "#0F4A38",
              lineHeight: 1.4,
              margin: "0 0 12px",
              fontWeight: 400,
            }}
          >
            {esOrganico
              ? "Contenido que detiene el scroll y genera reacción."
              : "El creativo que convierte sabe exactamente a quién le habla."}
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--sig-stone)",
              lineHeight: 1.65,
              margin: "0 0 14px",
            }}
          >
            {esOrganico ? (
              <>
                Cada generación produce{" "}
                <strong style={{ color: "var(--sig-forest)", fontWeight: 500 }}>
                  3 imágenes
                </strong>{" "}
                — cada una con{" "}
                <strong style={{ color: "var(--sig-forest)", fontWeight: 500 }}>
                  3 estilos de gancho
                </strong>
                . 9 opciones para elegir.
              </>
            ) : (
              <>
                Cada generación produce{" "}
                <strong style={{ color: "var(--sig-forest)", fontWeight: 500 }}>
                  3 creativos
                </strong>{" "}
                — uno para cada momento del proceso de compra de tu cliente. Los
                3 juntos forman una{" "}
                <strong style={{ color: "var(--sig-forest)", fontWeight: 500 }}>
                  campaña completa
                </strong>
                .
              </>
            )}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(esOrganico
              ? [
                  {
                    bold: "3 estilos de gancho",
                    resto:
                      " — Una pregunta que conecta, una afirmación directa y un llamado a actuar. Sube los 3 o elige el que más te guste.",
                  },
                  {
                    bold: "Sé específico",
                    resto: " — mejor descripción, imagen más potente.",
                  },
                  {
                    bold: "Tu foto o IA",
                    resto: " — si tienes fotos de tu producto, úsalas.",
                  },
                ]
              : [
                  {
                    bold: "Tortas y alfajores",
                    resto: " — genera una campaña para cada uno.",
                  },
                  {
                    bold: "Los 3 van juntos",
                    resto:
                      " — no elijas uno. La campaña funciona porque habla al cliente antes, durante y cuando está listo para comprar.",
                  },
                  {
                    bold: "Sé específico",
                    resto: " — mejor input, mejor creativo.",
                  },
                ]
            ).map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--sig-mid)",
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "var(--sig-stone)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  <strong
                    style={{ fontWeight: 500, color: "var(--sig-forest)" }}
                  >
                    {item.bold}
                  </strong>
                  {item.resto}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(15,74,56,0.10)",
              paddingTop: 12,
            }}
          >
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "13px",
                fontStyle: "italic",
                color: "var(--sig-forest)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {esOrganico
                ? "La imagen correcta no se busca — se genera."
                : "No es magia — es criterio."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Card resultado Meta Ads ───────────────────────────────────────────────────
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
        borderRadius: 12,
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
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 160px", padding: 16 }}>
          <ImagenConReintento
            src={variacion.foto}
            alt={aw.label}
            onClick={() => onExpandir(variacion.foto)}
            style={{
              width: "100%",
              aspectRatio: "1/1",
              objectFit: "cover",
              borderRadius: 8,
              border: "0.5px solid var(--sig-line)",
              cursor: "pointer",
            }}
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
        {[
          { titulo: "5 Títulos", items: variacion.titulos },
          { titulo: "5 Copies", items: variacion.copies },
        ].map(({ titulo, items }) => (
          <div
            key={titulo}
            style={{
              flex: "1 1 180px",
              padding: 16,
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
              {titulo}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {(items || []).map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                    background: "var(--sig-paper)",
                    borderRadius: 6,
                    padding: "6px 9px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
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
        ))}
      </div>
    </div>
  );
}

// ── Card resultado Orgánico ───────────────────────────────────────────────────
function CardOrganicoImagen({ imagen, variaciones, onCopy, onExpandir }) {
  const [varActiva, setVarActiva] = useState(0);
  const varActual = variaciones[varActiva];
  const gancho =
    GANCHO_LABELS[varActual?.gancho_style] || GANCHO_LABELS.pregunta;

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Tabs de variación */}
      <div
        style={{ display: "flex", borderBottom: "0.5px solid var(--sig-line)" }}
      >
        {variaciones.map((v, i) => {
          const g = GANCHO_LABELS[v.gancho_style] || GANCHO_LABELS.pregunta;
          const activo = i === varActiva;
          return (
            <button
              key={i}
              onClick={() => setVarActiva(i)}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: activo ? g.color : "white",
                border: "none",
                borderBottom: activo
                  ? `2px solid ${g.border}`
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: activo ? g.text : "var(--sig-stone)",
                  fontWeight: activo ? 700 : 400,
                }}
              >
                {g.label}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {/* Imagen */}
        <div style={{ flex: "0 0 160px", padding: 16 }}>
          <ImagenConReintento
            src={varActual?.foto || imagen.foto}
            alt="Orgánico"
            onClick={() => onExpandir(varActual?.foto || imagen.foto)}
            style={{
              width: "100%",
              aspectRatio: "1/1",
              objectFit: "cover",
              borderRadius: 8,
              border: "0.5px solid var(--sig-line)",
              cursor: "pointer",
            }}
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
        {/* Texto overlay + caption */}
        <div
          style={{
            flex: "1 1 220px",
            padding: 16,
            borderLeft: "0.5px solid var(--sig-line)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--sig-stone)",
                marginBottom: 8,
              }}
            >
              Texto en la imagen
            </p>
            <div
              style={{
                background: "var(--sig-paper)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "14px",
                  color: "var(--sig-forest)",
                  lineHeight: 1.4,
                }}
              >
                {varActual?.texto_overlay}
              </span>
              <button
                onClick={() => onCopy(varActual?.texto_overlay)}
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
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--sig-stone)",
                marginBottom: 8,
              }}
            >
              Caption sugerido
            </p>
            <div
              style={{
                background: "var(--sig-paper)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--sig-forest)",
                  lineHeight: 1.55,
                }}
              >
                {varActual?.caption}
              </span>
              <button
                onClick={() => onCopy(varActual?.caption)}
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
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                color: "var(--sig-stone)",
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Sugerencia — modifícalo a tu estilo antes de publicar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Barra de progreso circular ────────────────────────────────────────────────
function ProgresoCircular({ progreso }) {
  const r = 38;
  const circunferencia = 2 * Math.PI * r;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "32px 0",
      }}
    >
      <div style={{ position: "relative", width: 90, height: 90 }}>
        <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="var(--sig-line)"
            strokeWidth="7"
          />
          <circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="var(--sig-mid)"
            strokeWidth="7"
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
          }}
        >
          <span
            style={{
              fontSize: 16,
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
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--sig-forest)",
            marginBottom: 4,
          }}
        >
          Generando creativos...
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "var(--sig-stone)",
            lineHeight: 1.6,
          }}
        >
          Aprox. 1-2 minutos.
        </p>
      </div>
    </div>
  );
}

// ── Modal imagen expandida ────────────────────────────────────────────────────
function ModalImagen({ src, onClose }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
        alt="Ampliado"
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

// ── Pantalla selección de modo (Paso 0) ───────────────────────────────────────
function SeleccionModo({ onSeleccionar }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "var(--sig-stone)",
          marginBottom: 4,
        }}
      >
        ¿Para qué vas a usar estos creativos?
      </p>
      {[
        {
          id: "meta_ads",
          icono: <IconRadar />,
          label: "Anuncios pagados",
          sub: "Campañas en Facebook e Instagram Ads",
          detalle: "3 creativos con copies optimizados para conversión",
        },
        {
          id: "organico",
          icono: <IconOnda />,
          label: "Contenido orgánico",
          sub: "Instagram, WhatsApp, TikTok y más",
          detalle: "9 imágenes con texto integrado y caption sugerido",
        },
      ].map((op) => (
        <button
          key={op.id}
          type="button"
          onClick={() => onSeleccionar(op.id)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            padding: "18px 20px",
            borderRadius: 10,
            background: "white",
            border: "0.5px solid var(--sig-line-s)",
            cursor: "pointer",
            textAlign: "left",
            transition: "border-color 0.15s, background 0.15s",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--sig-mid)";
            e.currentTarget.style.background = "rgba(61,171,142,0.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--sig-line-s)";
            e.currentTarget.style.background = "white";
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 2 }}>{op.icono}</div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--sig-forest)",
                margin: "0 0 3px",
              }}
            >
              {op.label}
            </p>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                color: "var(--sig-mid)",
                margin: "0 0 6px",
                letterSpacing: "0.06em",
              }}
            >
              {op.sub}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "var(--sig-stone)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {op.detalle}
            </p>
          </div>
          <div
            style={{
              flexShrink: 0,
              alignSelf: "center",
              color: "var(--sig-stone)",
              fontSize: 18,
            }}
          >
            →
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Logo negocio (mismo tratamiento que NegociosScreen) ───────────────────────
function LogoNegocio({ negocio, size = 32 }) {
  if (negocio.logo_url) {
    return (
      <img
        src={negocio.logo_url}
        alt={negocio.nombre}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "0.5px solid var(--sig-line-s)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--sig-warm)",
        border: "0.5px solid var(--sig-line-s)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: size * 0.4,
          color: "var(--sig-forest)",
          lineHeight: 1,
        }}
      >
        {negocio.nombre?.charAt(0)?.toUpperCase() || "N"}
      </span>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function CampanasScreen({
  supabase,
  planActual,
  negocio: negocioProp,
  imagenesNegocio: imagenesNegocioProp,
  getToken,
  stats,
  onRefetch,
}) {
  const { user } = useUser();
  const { addToast } = useToast();
  const plan = PLANES[planActual] || PLANES.free;
  const creditos = stats
    ? {
        imagenes: stats.generaciones_estaticos ?? 0,
        videos: stats.generaciones_video ?? 0,
        analisis: stats.analisis_realizados ?? 0,
      }
    : null;
  const tieneCredito = {
    imagenes: creditos !== null ? creditos.imagenes < plan.imagenesTotal : true,
    videos: false,
    analisis: false,
  };
  const refetchCreditos = onRefetch ?? (() => {});
  const [negocio, setNegocio] = useState(negocioProp ?? null);
  const [imagenesNegocio, setImagenesNegocio] = useState(
    imagenesNegocioProp ?? [],
  );

  const [modoApp, setModoApp] = useState(() => {
    try {
      return localStorage.getItem("sig_modo") || null;
    } catch {
      return null;
    }
  });

  const [paso, setPaso] = useState(() => {
    try {
      const s = localStorage.getItem("sig_paso");
      return s ? parseInt(s) : 0;
    } catch {
      return 0;
    }
  });
  const [burbujaColapsada, setBurbujaColapsada] = useState(true);
  const [esMobil, setEsMobil] = useState(false);

  const [angulo, setAngulo] = useState(() => {
    try {
      const s = localStorage.getItem("sig_angulo");
      return s
        ? JSON.parse(s)
        : {
            promocionar: "",
            problema: "",
            diferencial: "",
            ofertaActiva: false,
            ofertaDetalle: "",
            ofertaPrecio: "",
            formato: "feed_1_1",
            modoImagen: "ia_pura",
          };
    } catch {
      return {
        promocionar: "",
        problema: "",
        diferencial: "",
        ofertaActiva: false,
        ofertaDetalle: "",
        ofertaPrecio: "",
        formato: "feed_1_1",
        modoImagen: "ia_pura",
      };
    }
  });

  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(() => {
    try {
      const s = localStorage.getItem("sig_resultado");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [errorGen, setErrorGen] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState(() => {
    try {
      const s = localStorage.getItem("sig_fotos");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [fotoIncompatible, setFotoIncompatible] = useState(false);

  const pollingRef = useRef(null);
  const progresoRef = useRef(null);
  const abortRef = useRef(null);
  const campanaIdRef = useRef(null);

  useEffect(() => {
    const check = () => setEsMobil(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setNegocio(negocioProp ?? null);
  }, [negocioProp]);

  useEffect(() => {
    setImagenesNegocio(imagenesNegocioProp ?? []);
  }, [imagenesNegocioProp]);

  useEffect(
    () => () => {
      clearInterval(pollingRef.current);
      clearInterval(progresoRef.current);
      if (abortRef.current) abortRef.current.abort();
    },
    [],
  );

  useEffect(() => {
    try {
      if (modoApp) localStorage.setItem("sig_modo", modoApp);
      else localStorage.removeItem("sig_modo");
    } catch {}
  }, [modoApp]);
  useEffect(() => {
    localStorage.setItem("sig_angulo", JSON.stringify(angulo));
  }, [angulo]);
  useEffect(() => {
    localStorage.setItem("sig_paso", paso);
  }, [paso]);
  useEffect(() => {
    if (resultado)
      localStorage.setItem("sig_resultado", JSON.stringify(resultado));
    else localStorage.removeItem("sig_resultado");
  }, [resultado]);
  useEffect(() => {
    localStorage.setItem("sig_fotos", JSON.stringify(imagenesSeleccionadas));
  }, [imagenesSeleccionadas]);

  const setA = (campo, valor) => setAngulo((a) => ({ ...a, [campo]: valor }));

  useEffect(() => {
    if (
      angulo.modoImagen !== "foto_directa" ||
      angulo.formato !== "stories_9_16"
    ) {
      setFotoIncompatible(false);
      return;
    }
    if (imagenesSeleccionadas.length === 0) {
      setFotoIncompatible(false);
      return;
    }
    const foto = imagenesNegocio.find((i) => i.id === imagenesSeleccionadas[0]);
    if (!foto) {
      setFotoIncompatible(false);
      return;
    }
    const img = new Image();
    img.onload = () =>
      setFotoIncompatible(img.naturalWidth / img.naturalHeight >= 0.65);
    img.onerror = () => setFotoIncompatible(false);
    img.src = foto.url;
  }, [
    imagenesSeleccionadas,
    angulo.modoImagen,
    angulo.formato,
    imagenesNegocio,
  ]);

  const limpiarTodo = () => {
    setModoApp(null);
    setResultado(null);
    setPaso(0);
    setAngulo({
      promocionar: "",
      problema: "",
      diferencial: "",
      ofertaActiva: false,
      ofertaDetalle: "",
      ofertaPrecio: "",
      formato: "feed_1_1",
      modoImagen: "ia_pura",
    });
    setImagenesSeleccionadas([]);
    [
      "sig_modo",
      "sig_angulo",
      "sig_paso",
      "sig_resultado",
      "sig_fotos",
    ].forEach((k) => localStorage.removeItem(k));
  };

  const validarPaso = () => {
    if (paso === 0) {
      if (!angulo.promocionar.trim()) {
        addToast("Indica qué quieres promocionar.", "error");
        return false;
      }
      if (!angulo.problema.trim()) {
        addToast("Indica el problema o deseo que activas.", "error");
        return false;
      }
    }
    if (paso === 1) {
      if (!angulo.diferencial.trim()) {
        addToast("Indica por qué elegirte.", "error");
        return false;
      }
    }
    if (paso === 2) {
      if (angulo.ofertaActiva && !angulo.ofertaDetalle.trim()) {
        addToast("Describe la oferta activa.", "error");
        return false;
      }
    }
    if (paso === 3) {
      if (fotoIncompatible) {
        addToast("Cambia el modo o el formato para continuar.", "error");
        return false;
      }
      if (
        angulo.modoImagen !== "ia_pura" &&
        imagenesSeleccionadas.length === 0
      ) {
        addToast("Selecciona al menos una foto para usar.", "error");
        return false;
      }
    }
    return true;
  };

  const siguientePaso = () => {
    if (!validarPaso()) return;
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  };
  const anteriorPaso = () => setPaso((p) => Math.max(p - 1, 0));

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
            const token = await getToken({ template: "supabase" });
            const clienteFresco = createSupabaseClient(token);
            const { data } = await clienteFresco
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
            console.error("[Polling] error:", e);
          }
        }, POLLING_INTERVAL_MS);
      });
    },
    [getToken],
  );

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

  const handleCopy = async (texto) => {
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(texto);
      else {
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

  const generarUna = async () => {
    const token = await getToken();
    const res = await fetch("/api/generar-imagen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        negocioId: negocio.id,
        angulo,
        formato: angulo.formato,
        modoImagen: angulo.modoImagen,
        modoApp,
        imagenesReferencia: imagenesNegocio
          .filter((i) => imagenesSeleccionadas.includes(i.id))
          .map((i) => i.url),
      }),
      signal: AbortSignal.timeout(480000),
    });
    if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
    const { campanaId } = await res.json();
    if (!campanaId) throw new Error("No se recibió ID de campaña");
    campanaIdRef.current = campanaId;
    return await iniciarPolling(campanaId, "imagenes");
  };

  const handleGenerar = async () => {
    if (!tieneCredito.imagenes) {
      addToast("Sin créditos suficientes.", "error");
      return;
    }
    setGenerando(true);
    setResultado(null);
    setErrorGen(null);
    iniciarProgreso();
    try {
      const res = await generarUna();
      clearInterval(progresoRef.current);
      setProgreso(100);
      setTimeout(() => setProgreso(0), 800);
      setResultado(res);
      campanaIdRef.current = null;
      setTimeout(async () => {
        await refetchCreditos();
        addToast("¡Creativos generados con éxito!", "success");
      }, 400);
    } catch (err) {
      if (err.name === "AbortError") return;
      setErrorGen(err.message || "Ocurrió un error. Intenta de nuevo.");
      addToast(err.message || "Error al generar.", "error");
    } finally {
      clearInterval(progresoRef.current);
      clearInterval(pollingRef.current);
      setGenerando(false);
    }
  };

  const handleCancelar = async () => {
    clearInterval(progresoRef.current);
    clearInterval(pollingRef.current);
    if (abortRef.current) abortRef.current.abort();
    setGenerando(false);
    setProgreso(0);
    addToast("Generación cancelada.", "info");
    if (campanaIdRef.current) {
      try {
        const token = await getToken({ template: "supabase" });
        const clienteFresco = createSupabaseClient(token);
        await clienteFresco
          .from("campanas_generadas")
          .update({ estado: "cancelado" })
          .eq("id", campanaIdRef.current);
        campanaIdRef.current = null;
      } catch (e) {
        console.error("Error marcando cancelacion:", e);
      }
    }
  };

  const inputStyle = {
    width: "100%",
    background: "white",
    border: "0.5px solid var(--sig-line-s)",
    borderRadius: 7,
    padding: "9px 12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    color: "var(--sig-forest)",
    outline: "none",
    transition: "border-color 0.15s",
    resize: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--sig-stone)",
    marginBottom: 6,
    display: "block",
  };
  const tieneImagenes = imagenesNegocio.length > 0;
  const opcionBtn = (activo, bloqueado = false) => ({
    padding: "10px 14px",
    borderRadius: 8,
    textAlign: "left",
    cursor: bloqueado ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: activo ? "rgba(61,171,142,0.06)" : "white",
    border: activo
      ? "1.5px solid var(--sig-mid)"
      : "0.5px solid var(--sig-line-s)",
    opacity: bloqueado ? 0.5 : 1,
  });
  const opcionLabel = (activo) => ({
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    fontWeight: activo ? 500 : 400,
    margin: 0,
    color: "var(--sig-forest)",
  });
  const opcionSub = (activo) => ({
    fontFamily: "'Space Mono', monospace",
    fontSize: "8px",
    margin: 0,
    color: activo ? "var(--sig-mid)" : "var(--sig-stone)",
  });
  const puntito = (activo) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    background: activo ? "var(--sig-mint)" : "var(--sig-line-s)",
  });

  const formatosDisponibles =
    modoApp === "meta_ads"
      ? [
          {
            id: "feed_1_1",
            ratio: "1:1",
            label: "Feed cuadrado",
            sub: "1:1 · Meta Ads Feed",
          },
          {
            id: "feed_4_5",
            ratio: "4:5",
            label: "Feed vertical",
            sub: "4:5 · Meta Ads Feed",
          },
        ]
      : [
          {
            id: "feed_1_1",
            ratio: "1:1",
            label: "Feed cuadrado",
            sub: "1:1 · Instagram Feed",
          },
          {
            id: "feed_4_5",
            ratio: "4:5",
            label: "Feed vertical",
            sub: "4:5 · Instagram Feed",
          },
          {
            id: "stories_9_16",
            ratio: "9:16",
            label: "Stories / Reels",
            sub: "9:16 · Stories, Reels, WhatsApp",
          },
        ];

  const labelPorQue =
    modoApp === "organico"
      ? "¿Qué quieres destacar en este contenido?"
      : "Por qué elegirte para esto";

  const placeholderPorQue =
    modoApp === "organico"
      ? "Ej: La frescura de mis ingredientes y que se prepara al momento."
      : "Ej: Entrega a domicilio el mismo día. / Ingredientes importados sin conservantes.";

  const hintPorQue =
    modoApp === "organico"
      ? "Este será el eje del mensaje visual. Cuanto más concreto, más impacto."
      : 'Evita "calidad y precio". Si tu diferencial es genérico, tu creativo también lo será.';

  const renderPaso = () => {
    if (paso === 0)
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span style={labelStyle}>Qué quieres promocionar</span>
            <textarea
              rows={3}
              style={inputStyle}
              placeholder="Ej: Tortas de chocolate para cumpleaños. / El batido Fuxión Energy para personas con cansancio crónico."
              value={angulo.promocionar}
              onChange={(e) => setA("promocionar", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--sig-line-s)")}
            />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "var(--sig-stone)",
                marginTop: 4,
              }}
            >
              Un solo producto. Esto es el núcleo de todos los creativos de esta
              generación.
            </p>
          </div>
          <div>
            <span style={labelStyle}>Qué problema resuelve o deseo activa</span>
            <textarea
              rows={3}
              style={inputStyle}
              placeholder="Ej: Quiero una torta rica para el cumple de mi hijo pero no sé dónde pedir."
              value={angulo.problema}
              onChange={(e) => setA("problema", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--sig-line-s)")}
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
        </div>
      );

    if (paso === 1)
      return (
        <div>
          <span style={labelStyle}>{labelPorQue}</span>
          <textarea
            rows={4}
            style={inputStyle}
            placeholder={placeholderPorQue}
            value={angulo.diferencial}
            onChange={(e) => setA("diferencial", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--sig-line-s)")}
          />
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "var(--sig-stone)",
              marginTop: 4,
            }}
          >
            {hintPorQue}
          </p>
        </div>
      );

    if (paso === 2)
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--sig-forest)",
                  margin: 0,
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "var(--sig-paper)",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div>
                <span style={labelStyle}>Descripción de la oferta</span>
                <input
                  style={inputStyle}
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
              <div>
                <span style={labelStyle}>Precio (opcional)</span>
                <input
                  style={inputStyle}
                  placeholder="Ej: Tortas desde S/45 · Alfajores S/8 la docena"
                  value={angulo.ofertaPrecio}
                  onChange={(e) =>
                    setA("ofertaPrecio", e.target.value.slice(0, 60))
                  }
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
                  Si tienes varios productos con distintos precios, escríbelos
                  todos.
                </p>
              </div>
            </div>
          )}
          {!angulo.ofertaActiva && (
            <div
              style={{
                background: "var(--sig-paper)",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--sig-stone)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {modoApp === "organico"
                  ? "Sin oferta activa. El contenido se enfocará en conectar con tu audiencia."
                  : 'Sin oferta activa. El creativo del nivel "Cierra al decidido" usará tu diferencial como argumento de cierre.'}
              </p>
            </div>
          )}
        </div>
      );

    if (paso === 3)
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <span style={labelStyle}>Formato</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {formatosDisponibles.map((f) => {
                const activo = angulo.formato === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setA("formato", f.id)}
                    style={opcionBtn(activo)}
                  >
                    <div
                      style={{
                        color: activo ? "var(--sig-mint)" : "var(--sig-stone)",
                        flexShrink: 0,
                      }}
                    >
                      <IconAspect ratio={f.ratio} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={opcionLabel(activo)}>{f.label}</p>
                      <p style={opcionSub(activo)}>{f.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {tieneImagenes && (
            <div>
              <span style={labelStyle}>Cómo usar tus fotos de producto</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  {
                    id: "foto_directa",
                    label: "Usar mi foto tal cual",
                    sub: "Tu imagen se usa directamente como base del creativo",
                  },
                  {
                    id: "foto_referencia",
                    label: "Usar como referencia visual",
                    sub: "La IA recrea el estilo de tu foto con mejor composición",
                  },
                  {
                    id: "ia_pura",
                    label: "Solo IA",
                    sub: "Ignora mis fotos — genera imágenes desde cero",
                  },
                ].map((m) => {
                  const activo = angulo.modoImagen === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setA("modoImagen", m.id);
                        if (m.id === "ia_pura") setImagenesSeleccionadas([]);
                      }}
                      style={opcionBtn(activo)}
                    >
                      <div style={puntito(activo)} />
                      <div style={{ flex: 1 }}>
                        <p style={opcionLabel(activo)}>{m.label}</p>
                        <p style={opcionSub(activo)}>{m.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {angulo.modoImagen !== "ia_pura" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {fotoIncompatible && (
                    <div
                      style={{
                        background: "var(--sig-paper)",
                        border: "0.5px solid var(--sig-line-s)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          color: "var(--sig-forest)",
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        Esta foto es horizontal o cuadrada — no encaja bien en
                        el formato 9:16 sin recortarse.
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          color: "var(--sig-forest)",
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        Puedes cambiar a "Usar como referencia visual" y la IA
                        adaptará el estilo de tu foto al formato Stories
                        correctamente.
                      </p>
                      <button
                        type="button"
                        onClick={() => setA("modoImagen", "foto_referencia")}
                        style={{
                          alignSelf: "flex-start",
                          padding: "7px 14px",
                          borderRadius: 7,
                          background: "var(--sig-mid)",
                          border: "none",
                          color: "white",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Usar como referencia visual
                      </button>
                    </div>
                  )}
                  {!fotoIncompatible && (
                    <>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--sig-stone)",
                        }}
                      >
                        Selecciona las fotos a usar
                      </span>
                      {angulo.modoImagen === "foto_directa" && (
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "11px",
                            color: "#C07820",
                            margin: "0 0 4px 0",
                          }}
                        >
                          Mejor resultado con el producto centrado en la foto.
                        </p>
                      )}
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {imagenesNegocio.map((img) => {
                          const seleccionada = imagenesSeleccionadas.includes(
                            img.id,
                          );
                          return (
                            <div
                              key={img.id}
                              onClick={() => {
                                if (seleccionada) {
                                  setImagenesSeleccionadas([]);
                                } else {
                                  setImagenesSeleccionadas([img.id]);
                                }
                              }}
                              style={{
                                position: "relative",
                                cursor: "pointer",
                                borderRadius: 8,
                                border: seleccionada
                                  ? "2px solid var(--sig-mid)"
                                  : "1.5px solid var(--sig-line-s)",
                                overflow: "hidden",
                                width: 64,
                                height: 64,
                                flexShrink: 0,
                                transition: "border 0.15s",
                              }}
                            >
                              <ImagenConReintento
                                src={img.url}
                                alt={img.nombre || "Referencia"}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                              {seleccionada && (
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(61,171,142,0.18)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: "var(--sig-mid)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 10 10"
                                      fill="none"
                                    >
                                      <path
                                        d="M2 5l2 2 4-4"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {imagenesSeleccionadas.length === 0 && (
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "11px",
                            color: "#C07820",
                            margin: 0,
                          }}
                        >
                          Selecciona al menos una foto para continuar.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              background: "var(--sig-aware-green)",
              borderRadius: 8,
              padding: "10px 14px",
              border: "0.5px solid var(--sig-aware-green-border)",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.06em",
                color: "var(--sig-aware-green-text)",
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              Esta generación consume <strong>1 crédito</strong>
              {creditos &&
                ` · Te quedan ${plan.imagenesTotal - creditos.imagenes} generaciones disponibles.`}
            </p>
          </div>
        </div>
      );
  };

  // ── Sin negocio ───────────────────────────────────────────────────────────────
  if (!negocio)
    return (
      <div style={{ minHeight: "100vh", background: "var(--sig-paper)" }}>
        <div style={{ maxWidth: "900px", padding: "0" }}>
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
              marginBottom: 24,
            }}
          >
            Nueva campaña
          </h1>
          <div
            style={{
              background: "var(--sig-aware-amber)",
              border: "0.5px solid var(--sig-aware-amber-border)",
              borderRadius: 10,
              padding: "16px 20px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "var(--sig-aware-amber-text)",
            }}
          >
            Primero debes registrar un negocio en la sección{" "}
            <strong>Mi negocio</strong> para poder generar creativos.
          </div>
        </div>
      </div>
    );

  // ── Render principal ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--sig-paper)" }}>
      <div style={{ maxWidth: "900px", padding: "0" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
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
            {modoApp && !generando && !resultado && (
              <button
                onClick={limpiarTodo}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--sig-stone)",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                ← Cambiar modo
              </button>
            )}
          </div>
          {/* Negocio con logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <LogoNegocio negocio={negocio} size={24} />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "var(--sig-stone)",
                margin: 0,
              }}
            >
              <strong style={{ color: "var(--sig-forest)" }}>
                {negocio.nombre}
              </strong>{" "}
              · {negocio.rubro}
              {modoApp && (
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    color: "var(--sig-mid)",
                    textTransform: "uppercase",
                  }}
                >
                  ·{" "}
                  {modoApp === "meta_ads"
                    ? "Anuncios pagados"
                    : "Contenido orgánico"}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Paso 0 — Selección de modo */}
        {!modoApp && !resultado && (
          <div
            style={{
              background: "white",
              border: "0.5px solid var(--sig-line)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <SeleccionModo
              onSeleccionar={(modo) => {
                setModoApp(modo);
                setPaso(0);
              }}
            />
          </div>
        )}

        {/* Wizard */}
        {modoApp && !generando && !resultado && (
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "stretch",
              flexDirection: esMobil ? "column" : "row",
            }}
          >
            <BurbujaInfo
              colapsada={esMobil ? burbujaColapsada : false}
              onToggle={() => setBurbujaColapsada((c) => !c)}
              esMobil={esMobil}
              modoApp={modoApp}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  background: "white",
                  border: "0.5px solid var(--sig-line)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <Progreso pasoActual={paso} />
                <div style={{ minHeight: 220 }}>{renderPaso()}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button
                    onClick={anteriorPaso}
                    disabled={paso === 0}
                    style={{
                      flex: 1,
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      borderRadius: 7,
                      cursor: paso === 0 ? "not-allowed" : "pointer",
                      background: "transparent",
                      border: "0.5px solid var(--sig-line-s)",
                      color: "var(--sig-stone)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      opacity: paso === 0 ? 0.4 : 1,
                    }}
                  >
                    ← Atrás
                  </button>
                  {paso < PASOS.length - 1 ? (
                    <button
                      onClick={siguientePaso}
                      style={{
                        flex: 1,
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: "var(--sig-forest)",
                        border: "none",
                        color: "var(--sig-warm)",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Siguiente →
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerar}
                      disabled={!tieneCredito.imagenes}
                      style={{
                        flex: 1,
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        borderRadius: 7,
                        cursor: tieneCredito.imagenes
                          ? "pointer"
                          : "not-allowed",
                        background: tieneCredito.imagenes
                          ? "var(--sig-forest)"
                          : "var(--sig-line)",
                        border: "none",
                        color: tieneCredito.imagenes
                          ? "var(--sig-warm)"
                          : "var(--sig-stone)",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Generar creativos →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generando */}
        {generando && (
          <div
            style={{
              background: "white",
              border: "0.5px solid var(--sig-line)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <ProgresoCircular progreso={progreso} />
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

        {/* Error */}
        {errorGen && !generando && (
          <div
            style={{
              background: "#FFF5F5",
              border: "0.5px solid #E57373",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 16,
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
                margin: 0,
              }}
            >
              {errorGen}
            </p>
            <button
              onClick={() => {
                setErrorGen(null);
                setPaso(0);
              }}
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

        {/* Resultados */}
        {resultado && !generando && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "20px",
                  color: "var(--sig-forest)",
                  margin: 0,
                }}
              >
                Creativos generados
              </p>
              <button
                onClick={limpiarTodo}
                style={{
                  padding: "8px 16px",
                  borderRadius: 7,
                  background: "var(--sig-forest)",
                  border: "none",
                  color: "var(--sig-warm)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                + Nueva campaña
              </button>
            </div>
            <div
              style={{
                background: "var(--sig-aware-green)",
                border: "0.5px solid var(--sig-aware-green-border)",
                borderRadius: 8,
                padding: "10px 16px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.06em",
                  color: "var(--sig-aware-green-text)",
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                Tus creativos están disponibles por <strong>24 horas</strong> —
                descárgalos antes de que expiren.
              </p>
            </div>
            {modoApp === "organico"
              ? (resultado.variaciones || []).map((img, i) => (
                  <CardOrganicoImagen
                    key={i}
                    imagen={img}
                    variaciones={img.variaciones_texto || []}
                    onCopy={handleCopy}
                    onExpandir={setImagenExpandida}
                  />
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
      </div>

      {imagenExpandida && (
        <ModalImagen
          src={imagenExpandida}
          onClose={() => setImagenExpandida(null)}
        />
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
