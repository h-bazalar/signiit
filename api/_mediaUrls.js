const EXTENSIONES_IMAGEN_PERMITIDAS = new Set(["jpg", "png", "webp"]);

function mediaUrlError(message = "URL de media invalida") {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getStorageConfig(config = {}) {
  const endpoint = config.endpoint ?? process.env.MINIO_ENDPOINT;
  const bucket = config.bucket ?? process.env.MINIO_BUCKET;

  if (!endpoint || !bucket) {
    throw new Error("Storage no configurado");
  }

  const endpointUrl = new URL(endpoint.replace(/\/+$/, ""));
  return { endpointUrl, bucket };
}

function encodePathSegment(segment) {
  return encodeURIComponent(String(segment));
}

function construirPathEsperado(endpointUrl, bucket, objectKey) {
  const basePath = endpointUrl.pathname.replace(/\/+$/, "");
  const bucketPath = encodePathSegment(bucket);
  const objectPath = objectKey.split("/").map(encodePathSegment).join("/");

  return `${basePath}/${bucketPath}/${objectPath}`.replace(/\/{2,}/g, "/");
}

function parseMediaUrl(url) {
  try {
    return new URL(url);
  } catch {
    throw mediaUrlError();
  }
}

function obtenerExtensionPermitida(url) {
  const pathname = parseMediaUrl(url).pathname;
  const archivo = pathname.split("/").pop() || "";
  const match = archivo.match(/\.([A-Za-z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();

  if (!extension || !EXTENSIONES_IMAGEN_PERMITIDAS.has(extension)) {
    throw mediaUrlError("Extension de imagen invalida");
  }

  return extension;
}

export function validarUrlMediaSigniit(url, objectKeyEsperado, config = {}) {
  if (typeof url !== "string" || !url.trim()) {
    throw mediaUrlError();
  }

  const { endpointUrl, bucket } = getStorageConfig(config);
  const parsedUrl = parseMediaUrl(url);

  if (parsedUrl.username || parsedUrl.password) {
    throw mediaUrlError();
  }

  if (parsedUrl.hash) {
    throw mediaUrlError();
  }

  if (parsedUrl.search) {
    throw mediaUrlError();
  }

  if (parsedUrl.protocol !== endpointUrl.protocol) {
    throw mediaUrlError();
  }

  if (parsedUrl.host !== endpointUrl.host) {
    throw mediaUrlError();
  }

  const pathEsperado = construirPathEsperado(
    endpointUrl,
    bucket,
    objectKeyEsperado,
  );

  if (parsedUrl.pathname !== pathEsperado) {
    throw mediaUrlError();
  }

  return `${endpointUrl.protocol}//${endpointUrl.host}${pathEsperado}`;
}

export function validarUrlLogo({ url, userId, negocioId, config = {} }) {
  const extension = obtenerExtensionPermitida(url);
  const objectKey = `logos/${userId}/${negocioId}.${extension}`;

  return validarUrlMediaSigniit(url, objectKey, config);
}

export function validarUrlImagenReferencia({
  url,
  userId,
  negocioId,
  imagenId,
  config = {},
}) {
  const extension = obtenerExtensionPermitida(url);
  const objectKey = `imagenes/${userId}/${negocioId}/${imagenId}.${extension}`;

  return validarUrlMediaSigniit(url, objectKey, config);
}
