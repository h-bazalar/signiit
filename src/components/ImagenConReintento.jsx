import { useState, useEffect } from "react";

/**
 * <img> con reintento automático de carga.
 * Resuelve el caso de imágenes recién subidas a MinIO que aún no propagan:
 * si la carga falla, reintenta con backoff en vez de quedar rota.
 *
 * Props: las mismas que un <img> normal (src, alt, style, onClick...).
 * Extra opcional: maxReintentos (default 3), delayBase ms (default 700).
 */
export default function ImagenConReintento({
  src,
  alt = "",
  maxReintentos = 3,
  delayBase = 700,
  ...rest
}) {
  const [intento, setIntento] = useState(0);
  const [falloFinal, setFalloFinal] = useState(false);

  // Reset cuando cambia el src (otra imagen)
  useEffect(() => {
    setIntento(0);
    setFalloFinal(false);
  }, [src]);

  const handleError = () => {
    if (intento < maxReintentos) {
      const siguiente = intento + 1;
      // backoff incremental: 700ms, 1400ms, 2100ms
      setTimeout(() => setIntento(siguiente), delayBase * siguiente);
    } else {
      setFalloFinal(true);
    }
  };

  // Cache-buster solo en reintentos (el intento 0 usa la URL limpia)
  const srcConIntento =
    intento === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}_r=${intento}`;

  if (falloFinal) {
    return (
      <div
        {...rest}
        style={{
          ...rest.style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--sig-warm)",
          color: "var(--sig-stone)",
          fontFamily: "'Space Mono', monospace",
          fontSize: "8px",
          textAlign: "center",
          padding: "4px",
        }}
      >
        No se pudo cargar
      </div>
    );
  }

  return (
    <img
      key={intento}
      src={srcConIntento}
      alt={alt}
      onError={handleError}
      {...rest}
    />
  );
}
