import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { PLANES } from "../utils/constants";

const VEINTE_CUATRO_HORAS = 24 * 60 * 60 * 1000;

const AWARENESS_LABELS = {
  solution_aware: "Atrae nuevos clientes",
  product_aware: "Convence al interesado",
  most_aware: "Cierra al decidido",
};

const GANCHO_LABELS = {
  pregunta: "Una pregunta que conecta",
  declaracion: "Una afirmación directa",
  cta: "Un llamado a actuar",
};

const AWARENESS_COLORS = {
  solution_aware: { bg: "#E4F5EF", text: "#0F4A38", border: "#3DAB8E" },
  product_aware: { bg: "#EBF0FB", text: "#1A3A7A", border: "#2E5FBE" },
  most_aware: { bg: "#FDF3E4", text: "#7A4A10", border: "#C07820" },
};

const GANCHO_COLORS = {
  pregunta: { bg: "#EBF0FB", text: "#1A3A7A", border: "#2E5FBE" },
  declaracion: { bg: "#E4F5EF", text: "#0F4A38", border: "#3DAB8E" },
  cta: { bg: "#FDF3E4", text: "#7A4A10", border: "#C07820" },
};

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

function CeldaCreativo({ foto, colores, labelTexto, onExpandirImagen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {foto ? (
        <div
          onClick={() => onExpandirImagen(foto)}
          style={{
            width: "100%",
            aspectRatio: "1/1",
            borderRadius: 8,
            overflow: "hidden",
            border: "0.5px solid rgba(15,74,56,0.12)",
            cursor: "pointer",
          }}
        >
          <img
            src={foto}
            alt={labelTexto}
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
            width: "100%",
            aspectRatio: "1/1",
            borderRadius: 8,
            background: "#E4F5EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          🖼️
        </div>
      )}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: colores.bg,
          border: `0.5px solid ${colores.border}40`,
          borderRadius: 4,
          padding: "3px 8px",
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: colores.border,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: colores.text,
            fontWeight: 700,
          }}
        >
          {labelTexto}
        </span>
      </div>
    </div>
  );
}

function IconoDescargar({ size = 13, color = "#fff", strokeWidth = 1.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <path
        d="M6.5 1v8M3.5 6.5l3 3 3-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 10.5h11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoAmpliar({ size = 10, color = "#fff", strokeWidth = 1.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M6 2H2v4M10 14h4v-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoCopiar({ size = 12, color = "#8C8880" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <rect
        x="4"
        y="4"
        width="8"
        height="8"
        rx="1.5"
        stroke={color}
        strokeWidth="1.1"
      />
      <path
        d="M2 9H1.5A1.5 1.5 0 010 7.5v-6A1.5 1.5 0 011.5 0h6A1.5 1.5 0 019 1.5V2"
        stroke={color}
        strokeWidth="1.1"
      />
    </svg>
  );
}

function FilaCreativoOrganico({ vt, onExpandirImagen, conBorde, onCopiar }) {
  const foto = vt.foto || null;
  const ganchoKey = vt.gancho_style;
  const colores = GANCHO_COLORS[ganchoKey] || GANCHO_COLORS.pregunta;
  const labelTexto = GANCHO_LABELS[ganchoKey] || "Gancho";
  const overlay = vt.texto_overlay || "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 0",
        borderBottom: conBorde ? "0.5px solid rgba(15,74,56,0.07)" : "none",
      }}
    >
      {foto ? (
        <div
          onClick={() => onExpandirImagen(foto)}
          style={{
            position: "relative",
            width: 76,
            height: 76,
            flexShrink: 0,
            borderRadius: 8,
            border: "0.5px solid rgba(15,74,56,0.12)",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <img
            src={foto}
            alt={labelTexto}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              width: 17,
              height: 17,
              borderRadius: 5,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconoAmpliar />
          </div>
        </div>
      ) : (
        <div
          style={{
            width: 76,
            height: 76,
            flexShrink: 0,
            borderRadius: 8,
            background: "#E4F5EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🖼️
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 5,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: colores.border,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "8px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8C8880",
            }}
          >
            {labelTexto}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#0F4A38",
            lineHeight: 1.3,
          }}
        >
          {overlay}
        </div>
        {vt.caption && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8C8880",
                marginBottom: 4,
              }}
            >
              Caption sugerido
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  flex: 1,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#8C8880",
                  lineHeight: 1.55,
                }}
              >
                {vt.caption}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopiar(vt.caption);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  color: "#8C8880",
                  flexShrink: 0,
                }}
              >
                <IconoCopiar />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DespliegueReciente({ item, onExpandirImagen, onCopiar }) {
  const variaciones = item.resultado?.variaciones || [];
  const esOrganico = item.resultado?.modoApp === "organico";

  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#F7F5F0",
        borderTop: "0.5px solid rgba(15,74,56,0.08)",
      }}
    >
      {esOrganico ? (
        <div
          style={{
            background: "#fff",
            border: "0.5px solid rgba(15,74,56,0.10)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          {variaciones.map((concepto, ci) => {
            const textos = concepto.variaciones_texto || [];
            return (
              <div key={ci}>
                {ci > 0 && (
                  <div
                    style={{
                      height: "0.5px",
                      background: "rgba(15,74,56,0.10)",
                      margin: "14px 0",
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "8px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#3DAB8E",
                    marginBottom: 3,
                  }}
                >
                  Concepto {ci + 1}
                </div>
                {concepto.tema_visual && (
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0F4A38",
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {concepto.tema_visual}
                  </div>
                )}
                {textos.map((vt, vi) => (
                  <FilaCreativoOrganico
                    key={vi}
                    vt={vt}
                    onExpandirImagen={onExpandirImagen}
                    conBorde={vi < textos.length - 1}
                    onCopiar={onCopiar}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${variaciones.length}, 1fr)`,
            gap: 12,
          }}
        >
          {variaciones.map((v, i) => {
            const awKey = v.awareness_level;
            const colores =
              AWARENESS_COLORS[awKey] || AWARENESS_COLORS.solution_aware;
            const labelTexto = AWARENESS_LABELS[awKey] || "Creativo";
            return (
              <CeldaCreativo
                key={i}
                foto={v.foto || null}
                colores={colores}
                labelTexto={labelTexto}
                onExpandirImagen={onExpandirImagen}
              />
            );
          })}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          color: "#8C8880",
        }}
      >
        <IconoAmpliar size={12} color="#8C8880" strokeWidth={1.4} />
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
          }}
        >
          Toca cualquier imagen para verla completa · Disponibles por 24 horas
          desde la generación
        </span>
      </div>
    </div>
  );
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
  const [expandidoId, setExpandidoId] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [verTodosAnteriores, setVerTodosAnteriores] = useState(false);

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
  const listaAnteriores = verTodosAnteriores
    ? anteriores
    : anteriores.slice(0, 3);

  const toggleExpandido = (id) => {
    setExpandidoId((prev) => (prev === id ? null : id));
  };

  const descargarImagen = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo descargar");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      a.download = `signiit-creativo-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Error descargando imagen:", e);
    }
  };

  const copiarTexto = async (texto) => {
    if (!texto) return;
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
    } catch (e) {
      console.error("Error copiando:", e);
    }
  };

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
              limite={limites.generacionesTotal}
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
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "20px",
                color: "#0F4A38",
                marginBottom: "8px",
              }}
            >
              {negociosCount === 0
                ? "Empieza por tu negocio."
                : "Todo listo para empezar."}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#8C8880",
                marginBottom: "20px",
              }}
            >
              {negociosCount === 0
                ? "Registra tu negocio para poder generar tus primeros creativos. Es el primer paso."
                : "Ve a Campañas para generar tus primeros creativos."}
            </p>
            <button
              onClick={() =>
                navigate(negociosCount === 0 ? "/negocios" : "/campanas")
              }
              style={{
                background: "#0F4A38",
                color: "#F7F5F0",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                gap: "7px",
                alignItems: "center",
              }}
            >
              {negociosCount === 0 ? "Crear mi negocio →" : "Ir a Campañas →"}
            </button>
          </div>
        ) : (
          <>
            {/* Recientes — con desplegable */}
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
                  const foto = item.resultado?.variaciones?.[0]?.foto || null;
                  const expandido = expandidoId === item.id;
                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => toggleExpandido(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "12px 20px",
                          borderBottom:
                            !expandido &&
                            (i < recientes.length - 1 || anteriores.length > 0)
                              ? "0.5px solid rgba(15,74,56,0.08)"
                              : "none",
                          background: expandido ? "#F0EDE6" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.1s ease",
                        }}
                      >
                        {/* Miniatura */}
                        {foto ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagenExpandida(foto);
                            }}
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

                        {/* Badge + chevron */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
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
                              whiteSpace: "nowrap",
                            }}
                          >
                            Expira pronto
                          </div>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            style={{
                              transform: expandido ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s",
                              color: "#8C8880",
                            }}
                          >
                            <path
                              d="M2 4l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Desplegable */}
                      {expandido && (
                        <DespliegueReciente
                          item={item}
                          onExpandirImagen={setImagenExpandida}
                          onCopiar={copiarTexto}
                        />
                      )}

                      {/* Separador después del desplegable */}
                      {expandido &&
                        (i < recientes.length - 1 || anteriores.length > 0) && (
                          <div
                            style={{
                              height: "0.5px",
                              background: "rgba(15,74,56,0.08)",
                            }}
                          />
                        )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Anteriores — solo registro */}
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
                {listaAnteriores.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 20px",
                      borderBottom:
                        i < listaAnteriores.length - 1
                          ? "0.5px solid rgba(15,74,56,0.08)"
                          : "none",
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
                {anteriores.length > 3 && !verTodosAnteriores && (
                  <button
                    onClick={() => setVerTodosAnteriores(true)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "10px 20px",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "var(--sig-mid)",
                    }}
                  >
                    Ver todos los anteriores ({anteriores.length - 3} más) →
                  </button>
                )}
                {verTodosAnteriores && anteriores.length > 3 && (
                  <button
                    onClick={() => setVerTodosAnteriores(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "10px 20px",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "var(--sig-mid)",
                    }}
                  >
                    ← Mostrar menos
                  </button>
                )}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              descargarImagen(imagenExpandida);
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <IconoDescargar size={16} />
          </button>
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "28px",
            color: "#0F4A38",
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
        {limite === 0 ? (
          <button
            onClick={() => navigate("/planes")}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--sig-warm)",
              background: "var(--sig-forest)",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Activar VIP →
          </button>
        ) : (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "#8C8880",
            }}
          >
            {Math.max(0, limite - usado)} disponibles
          </span>
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
