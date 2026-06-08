import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { PLANES, TONOS_MARCA } from "../utils/constants";

// ── Iconos inline ─────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <line
      x1="7"
      y1="2"
      x2="7"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="2"
      y1="7"
      x2="12"
      y2="7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M9 2L11 4L4.5 10.5L2 11L2.5 8.5L9 2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M2 4h9M5 4V2.5h3V4M4 4l.5 6.5h4L9 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
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

const IconSignal = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="2.5" fill="var(--sig-forest)" opacity="0.8" />
    <circle
      cx="10"
      cy="10"
      r="5.5"
      stroke="var(--sig-forest)"
      strokeWidth="1"
      fill="none"
      opacity="0.4"
    />
    <circle
      cx="10"
      cy="10"
      r="8.5"
      stroke="var(--sig-forest)"
      strokeWidth="0.7"
      fill="none"
      opacity="0.2"
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

// ── Rubros ────────────────────────────────────────────────────────────────────
const RUBROS = [
  "Alimentación y bebidas",
  "Belleza y cuidado personal",
  "Educación y formación",
  "Moda y accesorios",
  "Salud y bienestar",
  "Tecnología y servicios digitales",
  "Hogar y decoración",
  "Inmobiliaria",
  "Entretenimiento y eventos",
  "Finanzas y seguros",
  "Turismo y viajes",
  "Deporte y fitness",
  "Retail y tiendas",
  "Servicios profesionales",
  "Restaurantes y cafeterías",
  "Otro",
];

// ── Microcopy por campo ───────────────────────────────────────────────────────
const MICROCOPY = {
  nombre: 'El nombre que aparecerá en tus creativos. Usa el nombre que tus clientes ya conocen.',
  rubro: 'Nos ayuda a contextualizar el tono visual y el copy para tu industria.',
  producto: 'Ej (productos): "Batidos Fuxión para bajar de peso y ganar energía. Distribución a todo el Perú." — Ej (servicios): "Clases de inglés online para adultos que trabajan, nivel básico a avanzado." — Ej (local): "Pastelería artesanal: tortas personalizadas, cheesecakes y postres por encargo."',
  publico: 'Ej (masivo): "Mujeres de 30-50 años que quieren bajar de peso sin ir al gimnasio." — Ej (nicho): "Dueños de pymes que necesitan automatizar sus procesos sin saber programar." — Ej (local): "Familias de Miraflores y San Isidro que buscan postres para eventos o regalo."',
  diferencial: 'Ej (producto): "Distribuidores oficiales con entrega en 24h y asesoría personalizada." — Ej (servicio): "Profesores nativos, clases 1 a 1, horarios flexibles desde las 6am." — Ej (local): "Sin conservantes, ingredientes importados, lista de espera de solo 48h."',
  tono: 'Define cómo le habla tu marca a tu cliente. Afecta el registro de todo el copy generado.',
};

// ── Estado vacío del formulario ───────────────────────────────────────────────
const FORM_VACIO = {
  nombre: "",
  rubro: "",
  producto: "",
  publico: "",
  diferencial: "",
  tono: "",
};

// ── Componente Tooltip ────────────────────────────────────────────────────────
function Tooltip({ texto }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        style={{
          width: '15px', height: '15px', borderRadius: '50%',
          background: 'var(--sig-warm)', border: '0.5px solid var(--sig-line-s)',
          color: 'var(--sig-stone)', fontSize: '9px', fontFamily: "'Space Mono', monospace",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, cursor: 'default', userSelect: 'none',
        }}
        className="tooltip-trigger"
      >?</span>
      <span className="tooltip-box" style={{
        position: 'absolute', left: '20px', top: '-4px', zIndex: 10,
        background: 'var(--sig-forest)', color: 'var(--sig-warm)',
        fontFamily: "'DM Sans', sans-serif", fontSize: '11px', lineHeight: '1.55',
        padding: '8px 12px', borderRadius: '6px', width: '220px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s ease',
      }}>
        {texto}
      </span>
    </span>
  )
}

// ── Label de campo ────────────────────────────────────────────────────────────
function FieldLabel({ children, microcopy }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "6px",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--sig-stone)",
        }}
      >
        {children}
      </span>
      {microcopy && <Tooltip texto={microcopy} />}
    </div>
  );
}

// ── Card de negocio ───────────────────────────────────────────────────────────
function NegocioCard({ negocio, onEdit, onDelete }) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: "12px",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--sig-line-s)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--sig-line)")
      }
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--sig-aware-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSignal />
          </div>
          <div>
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "16px",
                color: "var(--sig-forest)",
                lineHeight: 1.2,
              }}
            >
              {negocio.nombre}
            </p>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                color: "var(--sig-stone)",
                marginTop: "2px",
              }}
            >
              {negocio.rubro?.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => onEdit(negocio)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "6px",
              background: "transparent",
              border: "0.5px solid var(--sig-line-s)",
              color: "var(--sig-forest)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--sig-warm)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <IconEdit /> Editar
          </button>

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                background: "transparent",
                border: "0.5px solid var(--sig-line-s)",
                color: "var(--sig-stone)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FFF0F0";
                e.currentTarget.style.borderColor = "#E57373";
                e.currentTarget.style.color = "#C0392B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--sig-line-s)";
                e.currentTarget.style.color = "var(--sig-stone)";
              }}
            >
              <IconTrash />
            </button>
          ) : (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => onDelete(negocio.id)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  background: "#C0392B",
                  border: "none",
                  color: "white",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirmando(false)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "0.5px solid var(--sig-line-s)",
                  color: "var(--sig-stone)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Datos */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
      >
        {[
          { label: "Qué vende", valor: negocio.producto },
          { label: "Público", valor: negocio.publico },
          { label: "Diferencial", valor: negocio.diferencial },
          { label: "Tono", valor: negocio.tono },
        ].map(({ label, valor }) => (
          <div
            key={label}
            style={{
              background: "var(--sig-paper)",
              borderRadius: "6px",
              padding: "8px 10px",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--sig-stone)",
                marginBottom: "3px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "var(--sig-forest)",
                lineHeight: "1.4",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {valor || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel lateral formulario ──────────────────────────────────────────────────
function PanelNegocio({ negocio, onClose, onGuardar, guardando }) {
  const esEdicion = !!negocio?.id;
  const [form, setForm] = useState(
    negocio
      ? {
          nombre: negocio.nombre || "",
          rubro: negocio.rubro || "",
          producto: negocio.producto || "",
          publico: negocio.publico || "",
          diferencial: negocio.diferencial || "",
          tono: negocio.tono || "",
        }
      : FORM_VACIO,
  );

  const [errores, setErrores] = useState({});

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: "" }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.rubro) e.rubro = "Selecciona un rubro";
    if (!form.producto.trim()) e.producto = "Requerido";
    if (!form.publico.trim()) e.publico = "Requerido";
    if (!form.diferencial.trim()) e.diferencial = "Requerido";
    if (!form.tono) e.tono = "Selecciona un tono";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = () => {
    if (!validar()) return;
    onGuardar({ ...form, id: negocio?.id });
  };

  const inputStyle = (campo) => ({
    width: "100%",
    background: "white",
    border: `0.5px solid ${errores[campo] ? "#E57373" : "var(--sig-line-s)"}`,
    borderRadius: "7px",
    padding: "9px 12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    color: "var(--sig-forest)",
    outline: "none",
    transition: "border-color 0.15s",
    resize: "none",
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,74,56,0.15)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "480px",
          background: "var(--sig-paper)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          borderLeft: "0.5px solid var(--sig-line-s)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header del panel */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "0.5px solid var(--sig-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "white",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "18px",
                color: "var(--sig-forest)",
                lineHeight: 1,
              }}
            >
              {esEdicion ? "Editar negocio" : "Nuevo negocio"}
            </p>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.1em",
                color: "var(--sig-stone)",
                marginTop: "4px",
              }}
            >
              {esEdicion
                ? "Actualiza la información de tu negocio"
                : "Completa los datos para generar creativos con intención"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              background: "transparent",
              border: "0.5px solid var(--sig-line-s)",
              color: "var(--sig-stone)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* ── BLOQUE 1 ── */}
          <div
            style={{
              background: "white",
              borderRadius: "10px",
              border: "0.5px solid var(--sig-line)",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
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
                1
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
                  Tu negocio
                </p>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "8px",
                    letterSpacing: "0.08em",
                    color: "var(--sig-stone)",
                  }}
                >
                  Se guarda una vez — edita cuando quieras
                </p>
              </div>
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel microcopy={MICROCOPY.nombre}>
                Nombre del negocio
              </FieldLabel>
              <input
                style={inputStyle("nombre")}
                placeholder="Ej: Pastelería Luna, Fuxión Perú, Studio Pilates"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = errores.nombre
                    ? "#E57373"
                    : "var(--sig-line-s)")
                }
              />
              {errores.nombre && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "4px",
                  }}
                >
                  {errores.nombre}
                </p>
              )}
            </div>

            {/* Rubro */}
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel microcopy={MICROCOPY.rubro}>Rubro</FieldLabel>
              <select
                style={{
                  ...inputStyle("rubro"),
                  appearance: "none",
                  cursor: "pointer",
                }}
                value={form.rubro}
                onChange={(e) => set("rubro", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = errores.rubro
                    ? "#E57373"
                    : "var(--sig-line-s)")
                }
              >
                <option value="">Selecciona un rubro...</option>
                {RUBROS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {errores.rubro && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "4px",
                  }}
                >
                  {errores.rubro}
                </p>
              )}
            </div>

            {/* Qué vendes */}
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel microcopy={MICROCOPY.producto}>Qué vendes</FieldLabel>
              <textarea
                style={{ ...inputStyle("producto"), minHeight: "72px" }}
                placeholder="Ej: Batidos y suplementos Fuxión para mejorar la energía, bajar de peso y dormir mejor. Distribución a todo el Perú."
                value={form.producto}
                onChange={(e) => set("producto", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = errores.producto
                    ? "#E57373"
                    : "var(--sig-line-s)")
                }
              />
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "var(--sig-stone)",
                  marginTop: "4px",
                  lineHeight: "1.5",
                }}
              >
                Lo que escribas aquí se convierte en el corazón de tus
                creativos. Cuanto más específico, mejor el resultado.
              </p>
              {errores.producto && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "2px",
                  }}
                >
                  {errores.producto}
                </p>
              )}
            </div>

            {/* Público */}
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel microcopy={MICROCOPY.publico}>
                Quién compra
              </FieldLabel>
              <textarea
                style={{ ...inputStyle("publico"), minHeight: "60px" }}
                placeholder="Ej: Mujeres de 30-50 años que quieren bajar de peso pero no tienen tiempo para el gimnasio y buscan algo natural."
                value={form.publico}
                onChange={(e) => set("publico", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = errores.publico
                    ? "#E57373"
                    : "var(--sig-line-s)")
                }
              />
              {errores.publico && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "4px",
                  }}
                >
                  {errores.publico}
                </p>
              )}
            </div>

            {/* Diferencial */}
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel microcopy={MICROCOPY.diferencial}>
                Por qué elegirte
              </FieldLabel>
              <textarea
                style={{ ...inputStyle("diferencial"), minHeight: "60px" }}
                placeholder="Ej: Somos distribuidores oficiales con entrega en 24h y acompañamiento personalizado. No vendemos solo el producto, vendemos resultados."
                value={form.diferencial}
                onChange={(e) => set("diferencial", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "var(--sig-mid)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = errores.diferencial
                    ? "#E57373"
                    : "var(--sig-line-s)")
                }
              />
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "var(--sig-stone)",
                  marginTop: "4px",
                  lineHeight: "1.5",
                }}
              >
                Evita "calidad y precio". Si tu diferencial es genérico, tu
                creativo también lo será.
              </p>
              {errores.diferencial && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "2px",
                  }}
                >
                  {errores.diferencial}
                </p>
              )}
            </div>

            {/* Tono */}
            <div>
              <FieldLabel microcopy={MICROCOPY.tono}>Tono de marca</FieldLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {TONOS_MARCA.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set("tono", t.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "7px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      textAlign: "left",
                      transition: "all 0.15s",
                      background:
                        form.tono === t.id ? "var(--sig-forest)" : "white",
                      color:
                        form.tono === t.id
                          ? "var(--sig-mint)"
                          : "var(--sig-forest)",
                      border:
                        form.tono === t.id
                          ? "0.5px solid var(--sig-forest)"
                          : "0.5px solid var(--sig-line-s)",
                      fontWeight: form.tono === t.id ? 500 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {errores.tono && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "#C0392B",
                    marginTop: "6px",
                  }}
                >
                  {errores.tono}
                </p>
              )}
            </div>
          </div>

          {/* Nota sobre Bloque 2 */}
          <div
            style={{
              background: "var(--sig-aware-green)",
              borderRadius: "8px",
              padding: "12px 14px",
              border: "0.5px solid var(--sig-aware-green-border)",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                color: "var(--sig-aware-green-text)",
                lineHeight: "1.6",
              }}
            >
              El enfoque de campaña (qué promocionar, oferta activa, destino y
              formato) lo defines al momento de generar tus creativos — no aquí.
            </p>
          </div>
        </div>

        {/* Footer con acción */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "0.5px solid var(--sig-line)",
            background: "white",
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: "0 0 auto",
              padding: "10px 18px",
              borderRadius: "7px",
              background: "transparent",
              border: "0.5px solid var(--sig-line-s)",
              color: "var(--sig-stone)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            style={{
              flex: 1,
              padding: "10px 18px",
              borderRadius: "7px",
              background: guardando ? "var(--sig-signal)" : "var(--sig-forest)",
              border: "none",
              color: "var(--sig-warm)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              cursor: guardando ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {guardando
              ? "Guardando..."
              : esEdicion
                ? "Guardar cambios"
                : "Crear negocio"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function NegociosScreen({ supabase, planActual }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [negocioEditando, setNegocioEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const plan = PLANES[planActual] || PLANES.free;
  const limiteNegocios = plan.negocios;
  const limitAlcanzado = negocios.length >= limiteNegocios;

  // ── Cargar negocios ──
  const cargarNegocios = async () => {
    if (!user) return;
    setCargando(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const { createSupabaseClient } = await import('../supabase.js');
      const client = createSupabaseClient(token);
      const { data, error } = await client
        .from('negocios')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNegocios(data || []);
    } catch (e) {
      console.error('Error cargando negocios:', e);
      mostrarToast('No se pudieron cargar los negocios.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNegocios();
  }, [supabase, user]);

  // ── Toast ──
  const mostrarToast = (mensaje, tipo = "ok") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Guardar (crear o editar) ──
  const handleGuardar = async (formData) => {
    if (!user) return;
    setGuardando(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const { createSupabaseClient } = await import('../supabase.js');
      const client = createSupabaseClient(token);
      if (formData.id) {
        const { error } = await client
          .from('negocios')
          .update({
            nombre: formData.nombre,
            rubro: formData.rubro,
            producto: formData.producto,
            publico: formData.publico,
            diferencial: formData.diferencial,
            tono: formData.tono,
          })
          .eq('id', formData.id)
          .eq('usuario_id', user.id);
        if (error) throw error;
        mostrarToast('Negocio actualizado.');
      } else {
        const { error } = await client
          .from('negocios')
          .insert({
            usuario_id: user.id,
            nombre: formData.nombre,
            rubro: formData.rubro,
            producto: formData.producto,
            publico: formData.publico,
            diferencial: formData.diferencial,
            tono: formData.tono,
          });
        if (error) throw error;
        mostrarToast('Negocio creado.');
      }
      setPanelAbierto(false);
      setNegocioEditando(null);
      await cargarNegocios();
    } catch (e) {
      console.error('Error guardando negocio:', e);
      mostrarToast('Ocurrió un error. Intenta nuevamente.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ──
  const handleEliminar = async (id) => {
    if (!user) return;
    try {
      const token = await getToken({ template: 'supabase' });
      const { createSupabaseClient } = await import('../supabase.js');
      const client = createSupabaseClient(token);
      const { error } = await client
        .from('negocios')
        .delete()
        .eq('id', id)
        .eq('usuario_id', user.id);
      if (error) throw error;
      mostrarToast('Negocio eliminado.');
      await cargarNegocios();
    } catch (e) {
      console.error('Error eliminando negocio:', e);
      mostrarToast('No se pudo eliminar. Intenta nuevamente.', 'error');
    }
  };

  // ── Abrir panel ──
  const abrirNuevo = () => {
    if (limitAlcanzado) return;
    setNegocioEditando(null);
    setPanelAbierto(true);
  };

  const abrirEdicion = (negocio) => {
    setNegocioEditando(negocio);
    setPanelAbierto(true);
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setNegocioEditando(null);
  };

  // ── Render ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--sig-paper)" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 100,
            background:
              toast.tipo === "error" ? "#C0392B" : "var(--sig-forest)",
            color: "var(--sig-warm)",
            padding: "10px 16px",
            borderRadius: "8px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            animation: "slideIn 0.2s ease",
          }}
        >
          {toast.mensaje}
        </div>
      )}

      <div
        style={{ maxWidth: '900px', padding: '0' }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--sig-stone)",
                marginBottom: "6px",
              }}
            >
              Mis negocios
            </p>
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "26px",
                color: "var(--sig-forest)",
                lineHeight: 1.1,
              }}
            >
              {negocios.length === 0 ? "Empieza aquí" : "Tus negocios"}
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "var(--sig-stone)",
                marginTop: "6px",
                lineHeight: "1.5",
              }}
            >
              {negocios.length === 0
                ? "Registra tu negocio para generar creativos con intención."
                : `${negocios.length} de ${limiteNegocios} negocios en tu plan ${plan.nombre}.`}
            </p>
          </div>

          {/* Botón nuevo */}
          <div style={{ position: "relative" }}>
            <button
              onClick={abrirNuevo}
              disabled={limitAlcanzado}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                borderRadius: "8px",
                background: limitAlcanzado
                  ? "var(--sig-warm)"
                  : "var(--sig-forest)",
                border: limitAlcanzado
                  ? "0.5px solid var(--sig-line-s)"
                  : "none",
                color: limitAlcanzado ? "var(--sig-stone)" : "var(--sig-warm)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                cursor: limitAlcanzado ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {limitAlcanzado ? <IconLock /> : <IconPlus />}
              Nuevo negocio
            </button>
            {limitAlcanzado && (
              <p style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                fontFamily: "'Space Mono', monospace", fontSize: '9px',
                letterSpacing: '0.06em', color: 'var(--sig-stone)',
                whiteSpace: 'nowrap', textAlign: 'right', lineHeight: '1.6',
              }}>
                Signiit es para un negocio por cuenta.<br/>
                ¿Tienes otro negocio? Abre una cuenta separada.
              </p>
            )}
          </div>
        </div>

        {/* Contenido */}
        {cargando ? (
          // Skeletons
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  border: "0.5px solid var(--sig-line)",
                  borderRadius: "12px",
                  padding: "20px 22px",
                  height: "140px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : negocios.length === 0 ? (
          // Estado vacío
          <div
            style={{
              background: "white",
              border: "0.5px solid var(--sig-line)",
              borderRadius: "16px",
              padding: "56px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "var(--sig-aware-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "4px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle
                  cx="13"
                  cy="13"
                  r="3"
                  fill="var(--sig-forest)"
                  opacity="0.8"
                />
                <circle
                  cx="13"
                  cy="13"
                  r="7"
                  stroke="var(--sig-forest)"
                  strokeWidth="1.2"
                  fill="none"
                  opacity="0.4"
                />
                <circle
                  cx="13"
                  cy="13"
                  r="11"
                  stroke="var(--sig-forest)"
                  strokeWidth="0.8"
                  fill="none"
                  opacity="0.2"
                />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "18px",
                color: "var(--sig-forest)",
              }}
            >
              Sin negocios todavía
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "var(--sig-stone)",
                lineHeight: "1.6",
                maxWidth: "320px",
              }}
            >
              Registra tu primer negocio para empezar a generar creativos
              diseñados para cada momento del proceso de compra.
            </p>
            <button
              onClick={abrirNuevo}
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 20px",
                borderRadius: "8px",
                background: "var(--sig-forest)",
                border: "none",
                color: "var(--sig-warm)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <IconPlus /> Registrar mi negocio
            </button>
          </div>
        ) : (
          // Lista de negocios
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {negocios.map((n) => (
              <NegocioCard
                key={n.id}
                negocio={n}
                onEdit={abrirEdicion}
                onDelete={handleEliminar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel lateral */}
      {panelAbierto && (
        <PanelNegocio
          negocio={negocioEditando}
          onClose={cerrarPanel}
          onGuardar={handleGuardar}
          guardando={guardando}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .tooltip-trigger:hover + .tooltip-box,
        .tooltip-trigger:focus + .tooltip-box {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
