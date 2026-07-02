import { useNavigate } from "react-router-dom";
import { WHATSAPP_NUMERO } from "../utils/constants";

// Páginas de retorno de MercadoPago (back_urls). Se renderizan tras el pago.
// El estado VIP lo activa el webhook en el server; al volver al home,
// sesion-init relee el plan ya actualizado.

const MENSAJE_RESCATE =
  "Hola, intenté contratar el VIP de Signiit y el pago no se completó. ¿Me ayudan a activarlo?";

const VARIANTES = {
  exitoso: {
    titulo: "¡Pago confirmado!",
    mensaje:
      "Tu plan VIP ya está activo. Tienes 36 generaciones y 6 análisis este mes.",
    cta: "Empezar a crear",
    destino: "/campanas",
    color: "var(--sig-aware-green)",
    borde: "var(--sig-aware-green-border)",
    texto: "var(--sig-aware-green-text)",
  },
  pendiente: {
    titulo: "Pago en proceso",
    mensaje:
      "Tu pago se está confirmando. En cuanto se acredite, tu VIP se activa solo. Puede tomar unos minutos.",
    cta: "Ir al inicio",
    destino: "/",
    color: "var(--sig-aware-amber)",
    borde: "var(--sig-aware-amber-border)",
    texto: "var(--sig-aware-amber-text)",
  },
  fallido: {
    titulo: "El pago no se completó",
    mensaje:
      "No se concretó el pago, así que no se te cobró nada. Puedes intentarlo de nuevo cuando quieras.",
    cta: "Volver a planes",
    destino: "/planes",
    color: "#FFF5F5",
    borde: "#E57373",
    texto: "#C0392B",
  },
};

export default function PagoRetorno({ variante }) {
  const navigate = useNavigate();
  const v = VARIANTES[variante] || VARIANTES.pendiente;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sig-paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "white",
          border: "0.5px solid var(--sig-line)",
          borderRadius: 16,
          padding: "40px 32px",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: v.color,
            border: `0.5px solid ${v.borde}`,
            borderRadius: 10,
            padding: "8px 14px",
            display: "inline-block",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: v.texto,
            }}
          >
            Signiit VIP
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "26px",
            color: "var(--sig-forest)",
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          {v.titulo}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "var(--sig-stone)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {v.mensaje}
        </p>
        <button
          onClick={() => navigate(v.destino, { replace: true })}
          style={{
            background: "var(--sig-forest)",
            color: "var(--sig-warm)",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: "13px",
            padding: "12px 28px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          {v.cta} →
        </button>

        {variante === "fallido" && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "0.5px solid var(--sig-line)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "var(--sig-stone)",
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              ¿El pago te rebotó y no sabes por qué? Te ayudamos a activarlo al
              toque.
            </p>

            <a
              href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
                MENSAJE_RESCATE,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: "var(--sig-forest)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: "13px",
                padding: "10px 22px",
                borderRadius: 8,
                border: "0.5px solid var(--sig-line-s)",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Resolverlo por WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
