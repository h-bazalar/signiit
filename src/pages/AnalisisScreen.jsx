import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

// ── Formato de moneda (espeja el backend; usa meta.moneda) ──
const SIMBOLOS = {
  PEN: "S/",
  USD: "$",
  EUR: "€",
  MXN: "$",
  COP: "$",
  CLP: "$",
  ARS: "$",
  BRL: "R$",
  GBP: "£",
  BOB: "Bs",
  UYU: "$U",
};
const hacerFmt = (moneda) => (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "N/A";
  const sim = SIMBOLOS[moneda];
  return sim
    ? `${sim} ${Number(n).toFixed(2)}`
    : `${moneda} ${Number(n).toFixed(2)}`;
};

// ── Metadata de buckets (orden, color, etiqueta) ──
const BUCKETS = [
  {
    key: "escalar",
    titulo: "Escalar",
    sub: "Sube presupuesto poco a poco",
    bg: "#E4F5EF",
    border: "#3DAB8E",
    text: "#0F4A38",
  },
  {
    key: "revivir",
    titulo: "Revivir",
    sub: "Reactiva en un conjunto nuevo",
    bg: "#EBF0FB",
    border: "#2E5FBE",
    text: "#1A3A7A",
  },
  {
    key: "apagar",
    titulo: "Apagar",
    sub: "Libera ese presupuesto",
    bg: "#FCEDEC",
    border: "#C0392B",
    text: "#8E2A20",
  },
  {
    key: "mantener",
    titulo: "Mantener",
    sub: "Observa, no toques",
    bg: "#FDF3E4",
    border: "#C07820",
    text: "#7A4A10",
  },
  {
    key: "cola",
    titulo: "En cola",
    sub: "Sin acción por ahora",
    bg: "#F0EDE6",
    border: "#8C8880",
    text: "#6A665F",
  },
  {
    key: "datos_insuficientes",
    titulo: "Sin datos suficientes",
    sub: "Déjalos correr unos días",
    bg: "#F7F5F0",
    border: "rgba(15,74,56,0.18)",
    text: "#8C8880",
  },
];

const ESTADO_COLOR = {
  verde: "#3DAB8E",
  amarillo: "#C07820",
  rojo: "#C0392B",
  neutro: "#8C8880",
};

const FLAG_LABEL = {
  fatiga: "Fatiga",
  fatiga_predictiva: "Fatiga próxima",
  ctr_bajo: "CTR bajo",
};

const URGENCIA_COLOR = {
  alta: { bg: "#FCEDEC", text: "#8E2A20", border: "#C0392B" },
  media: { bg: "#FDF3E4", text: "#7A4A10", border: "#C07820" },
  baja: { bg: "#F0EDE6", text: "#6A665F", border: "#8C8880" },
};

const leerArchivo = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });

// ════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function AnalisisScreen({ planActual }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [file7d, setFile7d] = useState(null);
  const [file30d, setFile30d] = useState(null);
  const [estado, setEstado] = useState("idle"); // idle | loading | done | error
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const esVip = planActual === "vip";

  const analizar = async () => {
    if (!file7d || !file30d) return;
    setEstado("loading");
    setError(null);
    try {
      const [contenido7d, contenido30d] = await Promise.all([
        leerArchivo(file7d),
        leerArchivo(file30d),
      ]);
      const token = await getToken();
      const res = await fetch("/api/analisis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenido7d, contenido30d }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({
          code: data.code || `HTTP_${res.status}`,
          mensaje: data.error || "Error generando el análisis.",
        });
        setEstado("error");
        return;
      }
      setResultado(data);
      setEstado("done");
    } catch (e) {
      const msg =
        e.name === "TimeoutError"
          ? "El análisis tardó demasiado. Intenta de nuevo."
          : e.message || "Ocurrió un error. Intenta de nuevo.";
      setError({ code: "CLIENT", mensaje: msg });
      setEstado("error");
    }
  };

  const reiniciar = () => {
    setFile7d(null);
    setFile30d(null);
    setResultado(null);
    setError(null);
    setEstado("idle");
  };

  if (!esVip) return <GateVip onUpgrade={() => navigate("/planes")} />;

  return (
    <div style={{ maxWidth: "900px" }}>
      <Encabezado />

      {estado === "loading" && <Cargando />}

      {(estado === "idle" || estado === "error") && (
        <>
          {estado === "error" && (
            <BloqueError error={error} onReintentar={reiniciar} />
          )}
          <Subida
            file7d={file7d}
            file30d={file30d}
            setFile7d={setFile7d}
            setFile30d={setFile30d}
            onAnalizar={analizar}
          />
        </>
      )}

      {estado === "done" && resultado && (
        <Resultado data={resultado} onNuevo={reiniciar} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ENCABEZADO
// ════════════════════════════════════════════════════════════════
function Encabezado() {
  return (
    <div style={{ marginBottom: "32px" }}>
      <p style={labelMono}>Análisis</p>
      <h1
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "28px",
          fontWeight: 400,
          color: "var(--sig-forest)",
          marginBottom: "6px",
        }}
      >
        Análisis de campañas
      </h1>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          color: "var(--sig-stone)",
        }}
      >
        Sube tus reportes de Meta Ads y te decimos qué escalar, qué apagar y qué
        revivir.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  GATE VIP
// ════════════════════════════════════════════════════════════════
function GateVip({ onUpgrade }) {
  return (
    <div style={{ maxWidth: "900px" }}>
      <Encabezado />
      <div
        style={{
          background: "white",
          border: "0.5px solid var(--sig-line)",
          borderRadius: "16px",
          padding: "48px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--sig-forest)",
            color: "var(--sig-mint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect
              x="4"
              y="9"
              width="14"
              height="10"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M7 9V6.5a4 4 0 018 0V9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "20px",
            color: "var(--sig-forest)",
          }}
        >
          El análisis es una función VIP
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "var(--sig-stone)",
            lineHeight: 1.6,
            maxWidth: "380px",
          }}
        >
          Sube tus reportes de Meta Ads y recibe decisiones claras — qué
          escalar, apagar o revivir — basadas en el rendimiento real de tu
          cuenta. Disponible en el plan VIP.
        </p>
        <button
          onClick={onUpgrade}
          style={{ ...btnPrimario, marginTop: "6px" }}
        >
          Activar VIP →
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SUBIDA DE CSVs
// ════════════════════════════════════════════════════════════════
function Subida({ file7d, file30d, setFile7d, setFile30d, onAnalizar }) {
  const [tutorialAbierto, setTutorialAbierto] = useState(false);
  const listo = !!file7d && !!file30d;

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: "16px",
        padding: "28px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <SlotArchivo
          etiqueta="Reporte de 7 días"
          descripcion="Últimos 7 días"
          file={file7d}
          onFile={setFile7d}
        />
        <SlotArchivo
          etiqueta="Reporte de 30 días"
          descripcion="Últimos 30 días"
          file={file30d}
          onFile={setFile30d}
        />
      </div>

      {/* Tutorial colapsable */}
      <div
        style={{
          border: "0.5px solid var(--sig-line)",
          borderRadius: "10px",
          marginBottom: "20px",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setTutorialAbierto((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--sig-paper)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--sig-forest)",
            }}
          >
            ¿Cómo exporto estos reportes de Meta Ads?
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: tutorialAbierto ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
              color: "var(--sig-stone)",
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
        </button>
        {tutorialAbierto && (
          <div
            style={{
              padding: "14px 16px",
              borderTop: "0.5px solid var(--sig-line)",
            }}
          >
            <ol
              style={{
                margin: 0,
                paddingLeft: "18px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "var(--sig-forest)",
                lineHeight: 1.7,
              }}
            >
              <li>
                En el Administrador de anuncios, ve a la pestaña{" "}
                <strong>Anuncios</strong>.
              </li>
              <li>
                Ajusta el rango de fechas a <strong>los últimos 7 días</strong>{" "}
                y exporta a CSV.
              </li>
              <li>
                Repite con el rango de <strong>los últimos 30 días</strong>.
              </li>
              <li>Sube cada CSV en su casilla de arriba.</li>
            </ol>
            <p
              style={{
                marginTop: "12px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "var(--sig-stone)",
                lineHeight: 1.6,
                background: "var(--sig-aware-green)",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            >
              Para desbloquear el análisis del gancho de tus videos, incluye al
              exportar las columnas
              <strong> “Reproducciones de video de 3 segundos” </strong> y{" "}
              <strong>“ThruPlays”</strong>.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onAnalizar}
        disabled={!listo}
        style={{
          ...btnPrimario,
          width: "100%",
          opacity: listo ? 1 : 0.45,
          cursor: listo ? "pointer" : "not-allowed",
        }}
      >
        Analizar campañas
      </button>
    </div>
  );
}

function SlotArchivo({ etiqueta, descripcion, file, onFile }) {
  const inputRef = useRef(null);
  const [errLocal, setErrLocal] = useState("");

  const seleccionar = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setErrLocal("Debe ser un archivo .csv");
      return;
    }
    setErrLocal("");
    onFile(f);
  };

  return (
    <div>
      <p style={{ ...labelMono, marginBottom: "8px" }}>{etiqueta}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={seleccionar}
      />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%",
          padding: "20px 16px",
          borderRadius: "10px",
          cursor: "pointer",
          background: file ? "var(--sig-aware-green)" : "var(--sig-paper)",
          border: file
            ? "1px solid var(--sig-mid)"
            : "1px dashed var(--sig-line-s)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.15s",
        }}
      >
        <div style={{ color: file ? "var(--sig-forest)" : "var(--sig-stone)" }}>
          {file ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10.5l4 4 8-9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 4v9M6 8l4-4 4 4M4 15h12"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--sig-forest)",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file ? file.name : `Subir CSV`}
        </p>
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.06em",
            color: "var(--sig-stone)",
          }}
        >
          {file ? "Cambiar archivo" : descripcion}
        </p>
      </button>
      {errLocal && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#C0392B",
            marginTop: "6px",
          }}
        >
          {errLocal}
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  CARGANDO
// ════════════════════════════════════════════════════════════════
function Cargando() {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--sig-line)",
        borderRadius: "16px",
        padding: "64px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--sig-mid)",
              animation: `sigBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <p
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "18px",
          color: "var(--sig-forest)",
        }}
      >
        Analizando tus campañas
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "var(--sig-stone)",
          textAlign: "center",
          maxWidth: "320px",
          lineHeight: 1.6,
        }}
      >
        Cruzando tus reportes de 7 y 30 días y clasificando cada anuncio. Puede
        tomar hasta un minuto.
      </p>
      <style>{`@keyframes sigBounce { 0%,100%{transform:translateY(0);opacity:0.5} 50%{transform:translateY(-6px);opacity:1} }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ERROR
// ════════════════════════════════════════════════════════════════
function BloqueError({ error, onReintentar }) {
  const esLimite = error?.code === "LIMITE_ALCANZADO";
  return (
    <div
      style={{
        background: esLimite ? "var(--sig-aware-amber)" : "#FCEDEC",
        border: `0.5px solid ${esLimite ? "var(--sig-aware-amber-border)" : "#C0392B"}`,
        borderRadius: "12px",
        padding: "16px 18px",
        marginBottom: "16px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          fontWeight: 500,
          color: esLimite ? "#7A4A10" : "#8E2A20",
          marginBottom: "4px",
        }}
      >
        {esLimite
          ? "Llegaste a tu límite del mes"
          : "No se pudo generar el análisis"}
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: esLimite ? "#7A4A10" : "#8E2A20",
          lineHeight: 1.5,
        }}
      >
        {error?.mensaje}
      </p>
      {!esLimite && (
        <button
          onClick={onReintentar}
          style={{ ...btnSecundario, marginTop: "12px" }}
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  RESULTADO (3 fases)
// ════════════════════════════════════════════════════════════════
function Resultado({ data, onNuevo }) {
  const {
    meta,
    panorama,
    buckets,
    metricas,
    fatiga,
    hook,
    creativosARegenerar,
    narrativa,
    disclaimer,
  } = data;
  const fmt = hacerFmt(meta.moneda);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Barra superior: contexto + nuevo análisis */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.08em",
            color: "var(--sig-stone)",
          }}
        >
          Objetivo: {meta.objetivo} · Referencia de tu cuenta:{" "}
          {fmt(meta.baselineCpa)} · {meta.totalAnuncios} anuncios
          {typeof meta.analisisUsados === "number"
            ? ` · ${meta.analisisUsados}/${meta.analisisLimite} este mes`
            : ""}
        </p>
        <button onClick={onNuevo} style={btnSecundario}>
          Nuevo análisis
        </button>
      </div>

      {/* ── FASE A — QUÉ PASÓ ── */}
      <Fase numero="01" titulo="Qué pasó">
        <Panorama panorama={panorama} meta={meta} fmt={fmt} />
      </Fase>

      {/* ── FASE B — QUÉ HACER ── */}
      <Fase numero="02" titulo="Qué hacer">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {BUCKETS.map((b) => {
            const ads = buckets[b.key] || [];
            if (ads.length === 0) return null;
            return (
              <GrupoBucket
                key={b.key}
                meta={b}
                ads={ads}
                fmt={fmt}
                objetivo={meta.objetivo}
              />
            );
          })}

          {creativosARegenerar?.length > 0 && (
            <CreativosARegenerar items={creativosARegenerar} />
          )}

          {(fatiga?.alertas?.length > 0 || fatiga?.predictivas?.length > 0) && (
            <Fatiga fatiga={fatiga} />
          )}
        </div>
      </Fase>

      {/* ── FASE C — POR QUÉ ── */}
      <Fase numero="03" titulo="Por qué">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Semaforo metricas={metricas} />
          <Hook hook={hook} />
          <Narrativa narrativa={narrativa} />
        </div>
      </Fase>

      {disclaimer && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "var(--sig-stone)",
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {disclaimer}
        </p>
      )}
    </div>
  );
}

function Fase({ numero, titulo, children }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.16em",
            color: "var(--sig-mid)",
          }}
        >
          {numero}
        </span>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "20px",
            fontWeight: 400,
            color: "var(--sig-forest)",
          }}
        >
          {titulo}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ── Panorama (Fase A) ──
function Panorama({ panorama, meta, fmt }) {
  const tarjetas = [
    { label: "Gasto (7 días)", valor: fmt(panorama.gastoTotal7d) },
    { label: meta.objetivo, valor: String(panorama.resultados7d) },
    { label: "CPA promedio", valor: fmt(panorama.cpaPromedio7d) },
    {
      label: "Presupuesto rentable",
      valor: `${panorama.pctPresupuestoRentable}%`,
    },
    { label: "Anuncios activos", valor: String(panorama.anunciosActivos) },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
      }}
    >
      {tarjetas.map((t) => (
        <div
          key={t.label}
          style={{
            background: "white",
            border: "0.5px solid var(--sig-line)",
            borderRadius: "12px",
            padding: "16px 18px",
          }}
        >
          <p style={{ ...labelMono, marginBottom: "8px" }}>{t.label}</p>
          <p
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "24px",
              color: "var(--sig-forest)",
              lineHeight: 1,
            }}
          >
            {t.valor}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Grupo de bucket (Fase B) ──
function GrupoBucket({ meta, ads, fmt, objetivo }) {
  return (
    <div
      style={{
        border: `0.5px solid ${meta.border}`,
        borderRadius: "12px",
        overflow: "hidden",
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: meta.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: meta.border,
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: meta.text,
            }}
          >
            {meta.titulo}
          </span>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              color: meta.text,
              opacity: 0.7,
            }}
          >
            · {meta.sub}
          </span>
        </div>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            fontWeight: 700,
            color: meta.text,
          }}
        >
          {ads.length}
        </span>
      </div>
      <div>
        {ads.map((ad, i) => (
          <TarjetaAnuncio
            key={ad.nombre + i}
            ad={ad}
            fmt={fmt}
            objetivo={objetivo}
            borde={i < ads.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaAnuncio({ ad, fmt, objetivo, borde }) {
  const cifras = [];
  if (ad.cpa7d !== null) cifras.push({ k: "CPA 7d", v: fmt(ad.cpa7d) });
  if (ad.cpaMes !== null) cifras.push({ k: "CPA mes", v: fmt(ad.cpaMes) });
  if (ad.cambioCpa !== null)
    cifras.push({
      k: "Cambio",
      v: `${ad.cambioCpa > 0 ? "+" : ""}${ad.cambioCpa}%`,
    });
  cifras.push({ k: "Gasto 7d", v: fmt(ad.gasto7d) });
  cifras.push({ k: objetivo, v: String(ad.resultados7d) });

  return (
    <div
      style={{
        padding: "14px 16px",
        borderTop: borde ? "0.5px solid var(--sig-line)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--sig-forest)",
          }}
        >
          {ad.nombre}
        </span>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--sig-stone)",
            border: "0.5px solid var(--sig-line-s)",
            borderRadius: "4px",
            padding: "2px 6px",
          }}
        >
          {ad.entrega === "active" ? "Activo" : "Inactivo"}
        </span>
        {ad.flagsFatiga?.map((f) => (
          <span
            key={f}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#7A4A10",
              background: "var(--sig-aware-amber)",
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            {FLAG_LABEL[f] || f}
          </span>
        ))}
      </div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "var(--sig-forest)",
          lineHeight: 1.55,
          marginBottom: "10px",
        }}
      >
        {ad.motivo}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {cifras.map((c) => (
          <div key={c.k}>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--sig-stone)",
                display: "block",
              }}
            >
              {c.k}
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--sig-forest)",
              }}
            >
              {c.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Creativos a regenerar (Fase B) ──
function CreativosARegenerar({ items }) {
  return (
    <div
      style={{
        border: "0.5px solid var(--sig-line)",
        borderRadius: "12px",
        background: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: "var(--sig-paper)",
          borderBottom: "0.5px solid var(--sig-line)",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--sig-forest)",
          }}
        >
          Creativos a regenerar
        </span>
      </div>
      {items.map((it, i) => {
        const c = URGENCIA_COLOR[it.urgencia] || URGENCIA_COLOR.baja;
        return (
          <div
            key={it.nombre + i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "12px 16px",
              borderTop: i > 0 ? "0.5px solid var(--sig-line)" : "none",
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: c.text,
                background: c.bg,
                border: `0.5px solid ${c.border}40`,
                borderRadius: "4px",
                padding: "3px 7px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {it.urgencia}
            </span>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--sig-forest)",
                  marginBottom: "2px",
                }}
              >
                {it.nombre}
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--sig-stone)",
                  lineHeight: 1.5,
                }}
              >
                {it.motivo}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Fatiga (Fase B) ──
function Fatiga({ fatiga }) {
  const filas = [
    ...fatiga.alertas.map((a) => ({ ...a, tipo: "Fatiga" })),
    ...fatiga.predictivas.map((a) => ({ ...a, tipo: "Fatiga próxima" })),
  ];
  return (
    <div
      style={{
        border: "0.5px solid var(--sig-line)",
        borderRadius: "12px",
        background: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: "var(--sig-paper)",
          borderBottom: "0.5px solid var(--sig-line)",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--sig-forest)",
          }}
        >
          Fatiga de creativos
        </span>
      </div>
      {filas.map((f, i) => (
        <div
          key={f.nombre + i}
          style={{
            padding: "12px 16px",
            borderTop: i > 0 ? "0.5px solid var(--sig-line)" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "3px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--sig-forest)",
              }}
            >
              {f.nombre}
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#7A4A10",
                background: "var(--sig-aware-amber)",
                borderRadius: "4px",
                padding: "2px 6px",
              }}
            >
              {f.tipo}
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                color: "var(--sig-stone)",
              }}
            >
              frec. {f.frecuencia}
            </span>
          </div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--sig-stone)",
              lineHeight: 1.5,
            }}
          >
            {f.nota}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Semáforo de métricas (Fase C) ──
function Semaforo({ metricas }) {
  const items = [
    { k: "CTR combinado", ...metricas.ctr, fmtVal: (v) => `${v}%` },
    { k: "Frecuencia promedio", ...metricas.frecuencia, fmtVal: (v) => `${v}` },
    { k: "CPM promedio", ...metricas.cpm, fmtVal: (v) => `${v}` },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
      }}
    >
      {items.map((m) => (
        <div
          key={m.k}
          style={{
            background: "white",
            border: "0.5px solid var(--sig-line)",
            borderRadius: "12px",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: ESTADO_COLOR[m.estado] || "#8C8880",
              }}
            />
            <span style={labelMono}>{m.k}</span>
          </div>
          <p
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "22px",
              color: "var(--sig-forest)",
              lineHeight: 1,
              marginBottom: "8px",
            }}
          >
            {m.valor !== null && m.valor !== undefined
              ? m.fmtVal(m.valor)
              : "N/A"}
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--sig-stone)",
              lineHeight: 1.5,
            }}
          >
            {m.lectura}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Hook (Fase C) ──
function Hook({ hook }) {
  if (!hook) return null;

  if (!hook.disponible) {
    return (
      <div
        style={{
          background: "var(--sig-aware-green)",
          border: "0.5px solid var(--sig-aware-green-border)",
          borderRadius: "12px",
          padding: "16px 18px",
        }}
      >
        <p style={{ ...labelMono, marginBottom: "6px" }}>Análisis de gancho</p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "var(--sig-forest)",
            lineHeight: 1.6,
          }}
        >
          {hook.mensaje}
        </p>
      </div>
    );
  }

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
          padding: "16px 18px",
          borderBottom: hook.anuncios?.length
            ? "0.5px solid var(--sig-line)"
            : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: ESTADO_COLOR[hook.estado],
            }}
          />
          <span style={labelMono}>Gancho de video (primeros 3 s)</span>
        </div>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "var(--sig-forest)",
            lineHeight: 1.6,
            marginBottom: "8px",
          }}
        >
          {hook.lectura}
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          <div>
            <span style={{ ...labelMono, display: "block" }}>Stop rate</span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--sig-forest)",
              }}
            >
              {hook.stopRatePromedio}%
            </span>
          </div>
          <div>
            <span style={{ ...labelMono, display: "block" }}>Retención</span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--sig-forest)",
              }}
            >
              {hook.retencionPromedio}%
            </span>
          </div>
        </div>
      </div>
      {hook.anuncios?.map((a, i) => (
        <div
          key={a.nombre + i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 18px",
            borderTop: i > 0 ? "0.5px solid var(--sig-line)" : "none",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "var(--sig-forest)",
              }}
            >
              {a.nombre}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "var(--sig-stone)",
              }}
            >
              {a.diagnostico}
            </p>
          </div>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--sig-forest)",
            }}
          >
            {a.stopRate}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Narrativa (Fase C) ──
function Narrativa({ narrativa }) {
  if (!narrativa) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {narrativa.resumenEjecutivo?.length > 0 && (
        <div
          style={{
            background: "white",
            border: "0.5px solid var(--sig-line)",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <p style={{ ...labelMono, marginBottom: "12px" }}>
            Resumen ejecutivo
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {narrativa.resumenEjecutivo.map((b, i) => (
              <li
                key={i}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "var(--sig-forest)",
                  lineHeight: 1.6,
                }}
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {narrativa.patronesGanadores?.length > 0 && (
        <div
          style={{
            background: "white",
            border: "0.5px solid var(--sig-line)",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <p style={{ ...labelMono, marginBottom: "12px" }}>
            Patrones ganadores
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {narrativa.patronesGanadores.map((p, i) => (
              <div key={i}>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--sig-forest)",
                    lineHeight: 1.5,
                  }}
                >
                  {p.descripcion}
                </p>
                {p.insight && (
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "var(--sig-stone)",
                      lineHeight: 1.5,
                      marginTop: "2px",
                    }}
                  >
                    {p.insight}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {narrativa.ensenanza && (
        <div
          style={{
            background: "var(--sig-forest)",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.4)",
              marginBottom: "8px",
            }}
          >
            La lección
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "16px",
              color: "var(--sig-warm)",
              lineHeight: 1.5,
            }}
          >
            {narrativa.ensenanza}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Estilos compartidos ──
const labelMono = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "9px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--sig-stone)",
};

const btnPrimario = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  background: "var(--sig-forest)",
  color: "var(--sig-warm)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  fontWeight: 500,
  padding: "12px 22px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
};

const btnSecundario = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "transparent",
  color: "var(--sig-forest)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "13px",
  fontWeight: 400,
  padding: "8px 16px",
  borderRadius: "8px",
  border: "0.5px solid var(--sig-line-s)",
  cursor: "pointer",
};
