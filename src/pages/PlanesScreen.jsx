import { useState } from "react";

const PLANES_INFO = [
  {
    id: "free",
    nombre: "Free",
    precio: "Gratis",
    tagline:
      "Prueba Signiit sin tarjeta. Ve el resultado antes de comprometerte.",
    estrella: false,
    features: [
      { texto: "1 negocio activo", activo: true },
      { texto: "3 generaciones únicas (no renuevan)", activo: true },
      { texto: "Anuncios pagados y contenido orgánico", activo: true },
      { texto: "Análisis de campañas Meta Ads", activo: false },
    ],
    cta: null,
  },
  {
    id: "vip",
    nombre: "VIP",
    precio: "S/99",
    periodo: "/mes",
    tagline: "Crea contenido que atrae, convence y vende — todos los meses.",
    estrella: true,
    destacado: true,
    features: [
      { texto: "1 negocio activo", activo: true },
      {
        texto: "36 generaciones/mes (108 imágenes reales con IA)",
        activo: true,
      },
      { texto: "Anuncios pagados y contenido orgánico", activo: true },
      { texto: "5 análisis de campañas Meta Ads/mes", activo: true },
    ],
    cta: {
      label: "Quiero el VIP →",
      url: "https://wa.me/51965797953?text=Hola%2C%20quiero%20activar%20el%20plan%20VIP%20de%20Signiit",
    },
  },
];

const IconCheck = ({ activo }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    {activo ? (
      <>
        <circle cx="7" cy="7" r="7" fill="var(--sig-aware-green)" />
        <path
          d="M4 7l2 2 4-4"
          stroke="var(--sig-aware-green-border)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <circle cx="7" cy="7" r="7" fill="var(--sig-warm)" />
        <path
          d="M4.5 9.5l5-5M9.5 9.5l-5-5"
          stroke="var(--sig-stone)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

const IconEstrella = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M6 1l1.4 2.8 3.1.45-2.25 2.19.53 3.1L6 8.1 3.22 9.54l.53-3.1L1.5 4.25l3.1-.45L6 1z"
      fill="var(--sig-mint)"
      stroke="var(--sig-mint)"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PlanesScreen({ planActual, creditos }) {
  const planesOrden = ["free", "vip"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--sig-paper)" }}>
      <div style={{ maxWidth: "900px", padding: "0" }}>
        <div style={{ marginBottom: 32 }}>
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
            Planes
          </p>
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "26px",
              color: "var(--sig-forest)",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Elige tu plan
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "var(--sig-stone)",
            }}
          >
            Sin contratos. Cancela cuando quieras.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {PLANES_INFO.map((plan) => {
            const esPlanActual = planActual === plan.id;
            const nivelActual = planesOrden.indexOf(planActual);
            const nivelPlan = planesOrden.indexOf(plan.id);
            const esPlanInferior = nivelPlan < nivelActual;

            return (
              <div
                key={plan.id}
                style={{
                  background: plan.destacado ? "var(--sig-forest)" : "white",
                  border: esPlanActual
                    ? "1.5px solid var(--sig-mid)"
                    : plan.destacado
                      ? "1.5px solid var(--sig-signal)"
                      : "0.5px solid var(--sig-line)",
                  borderRadius: 14,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  position: "relative",
                }}
              >
                {plan.destacado && !esPlanActual && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--sig-mint)",
                      color: "var(--sig-forest)",
                      fontSize: "9px",
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "3px 12px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Más completo
                  </div>
                )}

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          color: plan.destacado
                            ? "var(--sig-mint)"
                            : "var(--sig-stone)",
                        }}
                      >
                        {plan.nombre}
                      </span>
                      {plan.estrella && <IconEstrella />}
                    </div>
                    {esPlanActual && (
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "8px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(94,201,173,0.15)",
                          color: "var(--sig-mint)",
                          border: "0.5px solid rgba(94,201,173,0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Tu plan actual
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 3,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: "36px",
                        color: plan.destacado
                          ? "var(--sig-warm)"
                          : "var(--sig-forest)",
                        lineHeight: 1,
                      }}
                    >
                      {plan.precio}
                    </span>
                    {plan.periodo && (
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "13px",
                          color: plan.destacado
                            ? "rgba(240,237,230,0.5)"
                            : "var(--sig-stone)",
                        }}
                      >
                        {plan.periodo}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: plan.destacado
                        ? "rgba(240,237,230,0.6)"
                        : "var(--sig-stone)",
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {plan.tagline}
                  </p>
                </div>

                <div
                  style={{
                    height: "0.5px",
                    background: plan.destacado
                      ? "rgba(240,237,230,0.1)"
                      : "var(--sig-line)",
                  }}
                />

                <ul
                  style={{
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1,
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <IconCheck activo={feature.activo} />
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "13px",
                          color: plan.destacado
                            ? feature.activo
                              ? "var(--sig-warm)"
                              : "rgba(240,237,230,0.35)"
                            : feature.activo
                              ? "var(--sig-forest)"
                              : "var(--sig-stone)",
                          lineHeight: 1.5,
                          textDecoration: !feature.activo
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {feature.texto}
                      </span>
                    </li>
                  ))}
                </ul>

                {esPlanActual && plan.id === "free" && creditos && (
                  <div
                    style={{
                      background: "var(--sig-aware-green)",
                      border: "0.5px solid var(--sig-aware-green-border)",
                      borderRadius: 8,
                      padding: "10px 14px",
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
                      Usaste <strong>{creditos.imagenes}</strong> de 3
                      generaciones disponibles.
                    </p>
                  </div>
                )}

                {!esPlanActual && !esPlanInferior && plan.cta && (
                  <button
                    onClick={() => window.open(plan.cta.url, "_blank")}
                    style={{
                      background: "var(--sig-mint)",
                      color: "var(--sig-forest)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "13px",
                      padding: "12px 20px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--sig-mid)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--sig-mint)")
                    }
                  >
                    {plan.cta.label}
                  </button>
                )}

                {esPlanActual && plan.id === "vip" && (
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      color: "var(--sig-mint)",
                      textTransform: "uppercase",
                    }}
                  >
                    ✓ Ya tienes el mejor plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 32,
            padding: "14px 18px",
            background: "white",
            border: "0.5px solid var(--sig-line)",
            borderRadius: 10,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--sig-stone)",
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            Los creativos generados están disponibles por{" "}
            <strong style={{ color: "var(--sig-forest)" }}>24 horas</strong> —
            descárgalos antes de que expiren. El plan VIP se activa manualmente
            tras confirmar el pago por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
