import test from "node:test";
import assert from "node:assert/strict";
import { validarUrlImagenReferencia } from "./_mediaUrls.js";
import {
  crearCampanaYEnviarN8nImagenes,
  resolverUrlsReferenciaAutorizadas,
} from "./generar-imagen.js";

const endpoint = "https://storage.signiit.test";
const bucket = "signiit-media";
const userId = "user_123";
const negocioId = "negocio_456";
const imagenId = "imagen_789";
const urlLegitima = `${endpoint}/${bucket}/imagenes/${userId}/${negocioId}/${imagenId}.jpg`;
const n8nUrl = "https://n8n.signiit.test/webhook/generar-imagenes";
const n8nSecret = "secret_desde_env_test";

process.env.MINIO_ENDPOINT = endpoint;
process.env.MINIO_BUCKET = bucket;
process.env.N8N_WEBHOOK_IMAGENES = n8nUrl;
process.env.N8N_WEBHOOK_IMAGENES_SECRET = n8nSecret;

function assertUrlRechazada(url, overrides = {}, message) {
  assert.throws(
    () =>
      validarUrlImagenReferencia({
        url,
        userId: overrides.userId ?? userId,
        negocioId: overrides.negocioId ?? negocioId,
        imagenId: overrides.imagenId ?? imagenId,
        config: { endpoint, bucket },
      }),
    (error) => error?.status === 400,
    message,
  );
}

function mockSupabaseNegocioImagenes(rows) {
  return {
    from(table) {
      assert.equal(table, "negocio_imagenes");

      const filters = [];
      return {
        select(columns) {
          assert.equal(columns, "id, url");
          return this;
        },
        eq(column, value) {
          filters.push({ column, value });
          return this;
        },
        async in(column, values) {
          assert.equal(column, "url");
          const data = rows.filter(
            (row) =>
              values.includes(row.url) &&
              filters.every((filter) => row[filter.column] === filter.value),
          );
          return { data, error: null };
        },
      };
    },
  };
}

function mockSupabaseCampanasGeneradas() {
  const inserts = [];

  return {
    inserts,
    supabaseAdmin: {
      from(table) {
        assert.equal(table, "campanas_generadas");

        return {
          insert(payload) {
            inserts.push(payload);
            return this;
          },
          select(columns) {
            assert.equal(columns, "id");
            return this;
          },
          async single() {
            return { data: { id: "campana_123" }, error: null };
          },
        };
      },
    },
  };
}

function crearFetchMock() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { campanaId: "campana_123" };
      },
    };
  };

  return { calls, fetchImpl };
}

function payloadGeneracionN8n(overrides = {}) {
  return {
    n8nUrl: process.env.N8N_WEBHOOK_IMAGENES,
    n8nSecret: process.env.N8N_WEBHOOK_IMAGENES_SECRET,
    authUserId: userId,
    negocioId,
    formato: "feed_1_1",
    modoFinal: "foto_referencia",
    modoAppFinal: "meta_ads",
    urlsReferencia: [urlLegitima],
    angulo: { formato: "feed_1_1" },
    negocioLogoUrl: "",
    ...overrides,
  };
}

test("URL legitima de referencia propia es aceptada", () => {
  assert.equal(
    validarUrlImagenReferencia({
      url: urlLegitima,
      userId,
      negocioId,
      imagenId,
      config: { endpoint, bucket },
    }),
    urlLegitima,
  );
});

test("URLs con origen o path no esperado son rechazadas", () => {
  const casosRechazados = [
    {
      nombre: "ruta de otro usuario",
      url: `${endpoint}/${bucket}/imagenes/user_otro/${negocioId}/${imagenId}.jpg`,
    },
    {
      nombre: "otro negocio",
      url: `${endpoint}/${bucket}/imagenes/${userId}/negocio_otro/${imagenId}.jpg`,
    },
    {
      nombre: "otro imagenId",
      url: `${endpoint}/${bucket}/imagenes/${userId}/${negocioId}/imagen_otra.jpg`,
    },
    {
      nombre: "host externo",
      url: `https://evil.example/${bucket}/imagenes/a/b/c.jpg`,
    },
    {
      nombre: "hostname enganoso",
      url: `https://storage.signiit.test.evil.example/${bucket}/imagenes/${userId}/${negocioId}/${imagenId}.jpg`,
    },
    {
      nombre: "HTTP cuando MinIO es HTTPS",
      url: `http://storage.signiit.test/${bucket}/imagenes/${userId}/${negocioId}/${imagenId}.jpg`,
    },
    {
      nombre: "loopback",
      url: `http://127.0.0.1/${bucket}/imagenes/a/b/c.jpg`,
    },
    {
      nombre: "metadata IP link-local",
      url: `http://169.254.169.254/${bucket}/imagenes/a/b/c.jpg`,
    },
    {
      nombre: "credenciales embebidas",
      url: `https://user:pass@storage.signiit.test/${bucket}/imagenes/${userId}/${negocioId}/${imagenId}.jpg`,
    },
    {
      nombre: "fragmento",
      url: `${urlLegitima}#fragmento`,
    },
    {
      nombre: "query inesperada en referencia",
      url: `${urlLegitima}?v=123`,
    },
  ];

  for (const { nombre, url } of casosRechazados) {
    assertUrlRechazada(url, {}, nombre);
  }
});

test("generar-imagen acepta solo referencias registradas del mismo usuario y negocio", async () => {
  const supabaseAdmin = mockSupabaseNegocioImagenes([
    { id: imagenId, url: urlLegitima, usuario_id: userId, negocio_id: negocioId },
  ]);

  const urls = await resolverUrlsReferenciaAutorizadas({
    supabaseAdmin,
    userId,
    negocioId,
    modoImagen: "foto_referencia",
    imagenesReferencia: [urlLegitima],
  });

  assert.deepEqual(urls, [urlLegitima]);
});

test("generar-imagen rechaza URL propia no registrada en negocio_imagenes", async () => {
  const supabaseAdmin = mockSupabaseNegocioImagenes([]);

  await assert.rejects(
    resolverUrlsReferenciaAutorizadas({
      supabaseAdmin,
      userId,
      negocioId,
      modoImagen: "foto_directa",
      imagenesReferencia: [urlLegitima],
    }),
    (error) =>
      error?.status === 403 &&
      error?.message === "Imagen de referencia no autorizada",
  );
});

test("generar-imagen rechaza toda una lista con una referencia valida y otra invalida", async () => {
  const urlNoRegistrada = `${endpoint}/${bucket}/imagenes/${userId}/${negocioId}/imagen_no_registrada.jpg`;
  const supabaseAdmin = mockSupabaseNegocioImagenes([
    { id: imagenId, url: urlLegitima, usuario_id: userId, negocio_id: negocioId },
  ]);

  await assert.rejects(
    resolverUrlsReferenciaAutorizadas({
      supabaseAdmin,
      userId,
      negocioId,
      modoImagen: "foto_referencia",
      imagenesReferencia: [urlLegitima, urlNoRegistrada],
    }),
    (error) =>
      error?.status === 403 &&
      error?.message === "Imagen de referencia no autorizada",
  );
});

test("ia_pura ignora referencias y sigue con lista vacia", async () => {
  const urls = await resolverUrlsReferenciaAutorizadas({
    supabaseAdmin: mockSupabaseNegocioImagenes([]),
    userId,
    negocioId,
    modoImagen: "ia_pura",
    imagenesReferencia: ["https://evil.example/ssrf.jpg"],
  });

  assert.deepEqual(urls, []);
});

test("generar-imagen envia el secreto dedicado de env en el header hacia n8n", async () => {
  const { inserts, supabaseAdmin } = mockSupabaseCampanasGeneradas();
  const { calls, fetchImpl } = crearFetchMock();

  await crearCampanaYEnviarN8nImagenes({
    supabaseAdmin,
    fetchImpl,
    ...payloadGeneracionN8n(),
  });

  assert.equal(inserts.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, process.env.N8N_WEBHOOK_IMAGENES);
  assert.deepEqual(calls[0].options.headers, {
    "Content-Type": "application/json",
    "X-Signiit-Webhook-Secret": process.env.N8N_WEBHOOK_IMAGENES_SECRET,
  });
});

test("generar-imagen sin N8N_WEBHOOK_IMAGENES_SECRET responde 500 sin insertar ni llamar n8n", async () => {
  const { inserts, supabaseAdmin } = mockSupabaseCampanasGeneradas();
  const { calls, fetchImpl } = crearFetchMock();

  await assert.rejects(
    crearCampanaYEnviarN8nImagenes({
      supabaseAdmin,
      fetchImpl,
      ...payloadGeneracionN8n({ n8nSecret: undefined }),
    }),
    (error) =>
      error?.status === 500 &&
      error?.message === "Secreto de webhook de imagenes no configurado",
  );

  assert.equal(inserts.length, 0);
  assert.equal(calls.length, 0);
});

test("generar-imagen sin N8N_WEBHOOK_IMAGENES responde 500 sin insertar ni llamar n8n", async () => {
  const { inserts, supabaseAdmin } = mockSupabaseCampanasGeneradas();
  const { calls, fetchImpl } = crearFetchMock();

  await assert.rejects(
    crearCampanaYEnviarN8nImagenes({
      supabaseAdmin,
      fetchImpl,
      ...payloadGeneracionN8n({ n8nUrl: undefined }),
    }),
    (error) =>
      error?.status === 500 &&
      error?.message === "Webhook de imagenes no configurado",
  );

  assert.equal(inserts.length, 0);
  assert.equal(calls.length, 0);
});
