import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { PLANES } from "../utils/constants";

const VEINTE_CUATRO_HORAS = 24 * 60 * 60 * 1000;

function esReciente(created_at) {
  return Date.now() - new Date(created_at).getTime() < VEINTE_CUATRO_HORAS;
}

function formatearFecha(created_at) {
  return new Date(created_at).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerFoto(item) {
  try {
    const vars = item.resultado?.variaciones;
    if (Array.isArray(vars) && vars.length > 0) return vars[0].foto || null;
  } catch {}
  return null;
}

function etiquetaModo(item) {
  const modo = item.resultado?.modoApp;
  const formato = item.formato;
  const modoLabel = modo === "organico" ? "Orgánico" : "Meta Ads";
  const formatoLabel =
    formato === "feed_1_1"
      ? "1:1"
      : formato === "feed_4_5"
        ? "4:5"
        : formato === "stories_9_16"
          ? "9:16"
          : formato;
  return `${modoLabel} · ${formatoLabel}`;
}

export default function HomeScreen({
  supabase,
  planActual,
  stats,
  historial,
  onRefetch,
  negociosCount,
}) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [hoveredRow, setHoveredRow] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  const limites = PLANES[planActual] || PLANES.free;
  const nombre = user?.firstName || user?.fullName?.split(" ")[0] || "Usuario";

  const historialListo = (historial || []).filter(
    (item) => item.estado === "listo",
  );
  const recientes = historialListo.filter((item) =>
    esReciente(item.created_at),
  );
  const anteriores = historialListo.filter(
    (item) => !esReciente(item.created_at),
  );

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#8C8880",
            marginBottom: "6px",
          }}
        >
          Resumen
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "28px",
            fontWeight: "400",
            color: "#0F4A38",
            marginBottom: "6px",
          }}
        >
          Hola, {nombre}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#8C8880",
          }}
        >
          Este es tu resumen del mes actual.
        </p>
      </div>

      {/* Tarjetas de stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        {!stats ? (
          Array(3)
            .fill(0)
            .map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Imágenes generadas"
              usado={stats?.generaciones_estaticos || 0}
              limite={limites.imagenesTotal}
              color="#3DAB8E"
            />
            <StatCard
              label="Análisis realizados"
              usado={stats?.analisis_realizados || 0}
              limite={limites.analisis}
              color="#3DAB8E"
              planActual={planActual}
            />
            <StatCard
              label="Negocios activos"
              usado={negociosCount ?? 0}
              limite={limites.negocios}
              color="#3DAB8E"
            />
          </>
        )}
      </div>

      {/* Historial */}
      <div
        style={{
          background: "white",
          border: "0.5px solid rgba(15,74,56,0.10)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header historial */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid rgba(15,74,56,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: "500",
              color: "#0F4A38",
            }}
          >
            Historial reciente
          </span>
          {recientes.length > 0 && (
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#3DAB8E",
                background: "#E4F5EF",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              {recientes.length} disponible{recientes.length > 1 ? "s" : ""} ·
              expira en 24h
            </span>
          )}
        </div>

        {/* Loading */}
        {!stats ? (
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "64px",
                    background: "#F7F5F0",
                    borderRadius: "6px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
          </div>
        ) : historialListo.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "20px",
                color: "#0F4A38",
                marginBottom: "8px",
              }}
            >
              Todo listo para empezar.
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#8C8880",
              }}
            >
              Ve a Campañas para generar tus primeros creativos.
            </p>
          </div>
        ) : (
          <>
            {/* Recientes — con imagen */}
            {recientes.length > 0 && (
              <div>
                <div
                  style={{
                    padding: "8px 20px",
                    background: "#F7F5F0",
                    borderBottom: "0.5px solid rgba(15,74,56,0.08)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#8C8880",
                    }}
                  >
                    Últimas 24 horas
                  </span>
                </div>
                {recientes.map((item, i) => {
                  const foto = obtenerFoto(item);
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredRow(item.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "12px 20px",
                        borderBottom:
                          i < recientes.length - 1 || anteriores.length > 0
                            ? "0.5px solid rgba(15,74,56,0.08)"
                            : "none",
                        background:
                          hoveredRow === item.id ? "#F7F5F0" : "transparent",
                        transition: "background 0.1s ease",
                      }}
                    >
                      {/* Miniatura */}
                      {foto ? (
                        <div
                          onClick={() => setImagenExpandida(foto)}
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "0.5px solid rgba(15,74,56,0.12)",
                            flexShrink: 0,
                            cursor: "pointer",
                          }}
                        >
                          <img
                            src={foto}
                            alt="Creativo"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "8px",
                            background: "#E4F5EF",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                          }}
                        >
                          🖼️
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#0F4A38",
                            marginBottom: "3px",
                          }}
                        >
                          Creativos generados
                        </div>
                        <div
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "9px",
                            letterSpacing: "0.06em",
                            color: "#8C8880",
                          }}
                        >
                          {etiquetaModo(item)} ·{" "}
                          {formatearFecha(item.created_at)}
                        </div>
                      </div>

                      {/* Badge expira */}
                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "8px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "#3DAB8E",
                          background: "#E4F5EF",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Expira pronto
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Anteriores — sin imagen */}
            {anteriores.length > 0 && (
              <div>
                <div
                  style={{
                    padding: "8px 20px",
                    background: "#F7F5F0",
                    borderBottom: "0.5px solid rgba(15,74,56,0.08)",
                    borderTop:
                      recientes.length > 0
                        ? "0.5px solid rgba(15,74,56,0.08)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#8C8880",
                    }}
                  >
                    Anteriores
                  </span>
                </div>
                {anteriores.map((item, i) => (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 20px",
                      borderBottom:
                        i < anteriores.length - 1
                          ? "0.5px solid rgba(15,74,56,0.08)"
                          : "none",
                      background:
                        hoveredRow === item.id ? "#F7F5F0" : "transparent",
                      transition: "background 0.1s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "rgba(15,74,56,0.15)",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "12px",
                            color: "#0F4A38",
                          }}
                        >
                          Creativos generados
                        </div>
                        <div
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "9px",
                            letterSpacing: "0.06em",
                            color: "#8C8880",
                          }}
                        >
                          {etiquetaModo(item)} ·{" "}
                          {formatearFecha(item.created_at)}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "8px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#8C8880",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Expirado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal imagen expandida */}
      {imagenExpandida && (
        <div
          onClick={() => setImagenExpandida(null)}
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
          <img
            src={imagenExpandida}
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
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid rgba(15,74,56,0.10)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          height: "10px",
          width: "55%",
          background: "#F0EDE6",
          borderRadius: "4px",
          marginBottom: "12px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: "28px",
          width: "35%",
          background: "#F0EDE6",
          borderRadius: "4px",
          marginBottom: "12px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: "3px",
          background: "#F0EDE6",
          borderRadius: "2px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function StatCard({ label, usado, limite, color, planActual }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const porcentaje = limite > 0 ? Math.min((usado / limite) * 100, 100) : 0;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        border: `0.5px solid ${hovered ? "rgba(15,74,56,0.25)" : "rgba(15,74,56,0.10)"}`,
        borderRadius: "12px",
        padding: "20px",
        transition: "border-color 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8C8880",
          }}
        >
          {label}
        </span>
        {limite === 0 && (
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "8px",
              color: "var(--sig-mint)",
              background: "rgba(94,201,173,0.12)",
              border: "0.5px solid rgba(94,201,173,0.3)",
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            ⭐ VIP
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "28px",
          color: "#0F4A38",
          marginBottom: "2px",
          lineHeight: 1,
        }}
      >
        {usado}
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#8C8880",
            fontWeight: "400",
          }}
        >
          /{limite}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          color: "#8C8880",
          marginBottom: "12px",
        }}
      >
        {limite === 0 ? (
          <button
            onClick={() => navigate("/planes")}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--sig-forest)",
              background: "var(--sig-aware-green)",
              border: "none",
              borderRadius: "6px",
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            Activar VIP →
          </button>
        ) : (
          `${Math.max(0, limite - usado)} disponibles`
        )}
      </div>
      <div
        style={{
          height: "3px",
          background: "#F0EDE6",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${porcentaje}%`,
            background: color,
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
