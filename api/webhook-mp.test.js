import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { crearWebhookMercadoPagoHandler } from "./webhook-mp.js";

const secret = "mp_webhook_secret_test";
const accessToken = "mp_access_token_test";
const env = {
  MP_WEBHOOK_SECRET: secret,
  MP_ACCESS_TOKEN: accessToken,
};
const paymentId = "PAY_123";
const requestId = "request-123";
const ts = "1723310000";
const fixedNow = new Date("2026-08-10T12:00:00.000Z");
const validPayment = {
  status: "approved",
  currency_id: "PEN",
  transaction_amount: 99,
  external_reference: "user_123",
};

let originalConsoleError;
let originalConsoleLog;

beforeEach(() => {
  originalConsoleError = console.error;
  originalConsoleLog = console.log;
  console.error = () => {};
  console.log = () => {};
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

function firmaValida(id = paymentId) {
  const manifest = `id:${String(id).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

function reqWebhook(overrides = {}) {
  return {
    method: "POST",
    query: { type: "payment", "data.id": paymentId },
    body: {},
    headers: {
      "x-signature": firmaValida(overrides.paymentId ?? paymentId),
      "x-request-id": requestId,
      ...overrides.headers,
    },
    ...overrides.req,
  };
}

function resMock() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function fetchPago(pago = validPayment) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return pago;
      },
    };
  };
  return { calls, fetchImpl };
}

function fetchError(status = 502) {
  return async () => ({
    ok: false,
    status,
    async text() {
      return "mp error";
    },
  });
}

function crearSupabaseMock(options = {}) {
  const state = {
    processed: options.processed ?? false,
    userExists: options.userExists ?? true,
    userSelectError: options.userSelectError ?? null,
    updateError: options.updateError ?? null,
    updateAffected: options.updateAffected ?? true,
    insertError: options.insertError ?? null,
    updates: [],
    inserts: [],
  };

  return {
    state,
    client: {
      from(table) {
        const query = {
          table,
          operation: "select",
          filters: [],
          select() {
            return this;
          },
          eq(column, value) {
            this.filters.push({ column, value });
            return this;
          },
          update(payload) {
            this.operation = "update";
            state.updates.push(payload);
            return this;
          },
          async maybeSingle() {
            if (table === "pagos_procesados") {
              return {
                data: state.processed ? { payment_id: String(paymentId) } : null,
                error: null,
              };
            }

            const clerkId = this.filters.find(
              (filter) => filter.column === "clerk_id",
            )?.value;

            if (this.operation === "update") {
              return {
                data: state.updateAffected ? { clerk_id: clerkId } : null,
                error: state.updateError,
              };
            }

            return {
              data: state.userExists ? { clerk_id: clerkId } : null,
              error: state.userSelectError,
            };
          },
          async insert(payload) {
            state.inserts.push(payload);
            return { error: state.insertError };
          },
        };

        return query;
      },
    },
  };
}

async function ejecutarWebhook({ req = reqWebhook(), supabase, fetchImpl } = {}) {
  const supabaseMock = supabase ?? crearSupabaseMock();
  const fetchMock = fetchImpl ?? fetchPago().fetchImpl;
  const res = resMock();
  const handler = crearWebhookMercadoPagoHandler({
    createSupabaseClient: () => supabaseMock.client,
    fetchImpl: fetchMock,
    env,
    now: () => fixedNow,
  });

  await handler(req, res);
  return { res, supabase: supabaseMock };
}

test("rechaza metodo incorrecto", async () => {
  const { res } = await ejecutarWebhook({ req: { method: "GET", headers: {} } });

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Method not allowed" });
});

test("ackea eventos distintos de payment sin activar", async () => {
  const { res, supabase } = await ejecutarWebhook({
    req: reqWebhook({ req: { query: { type: "merchant_order" } } }),
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ignored: true });
  assert.equal(supabase.state.updates.length, 0);
  assert.equal(supabase.state.inserts.length, 0);
});

test("rechaza firma ausente o invalida", async () => {
  for (const headers of [
    { "x-signature": undefined },
    { "x-signature": `ts=${ts},v1=00` },
  ]) {
    const { res } = await ejecutarWebhook({ req: reqWebhook({ headers }) });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: "Firma inválida" });
  }
});

test("ackea payment pending y rejected sin activar", async () => {
  for (const status of ["pending", "rejected"]) {
    const { res, supabase } = await ejecutarWebhook({
      fetchImpl: fetchPago({ ...validPayment, status }).fetchImpl,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status });
    assert.equal(supabase.state.updates.length, 0);
    assert.equal(supabase.state.inserts.length, 0);
  }
});

test("devuelve 500 si falla la consulta a MercadoPago", async () => {
  const { res } = await ejecutarWebhook({ fetchImpl: fetchError(503) });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "No se pudo verificar el pago" });
});

test("devuelve 500 si hay timeout consultando MercadoPago", async () => {
  const timeoutError = new Error("timeout");
  timeoutError.name = "TimeoutError";

  const { res } = await ejecutarWebhook({
    fetchImpl: async () => {
      throw timeoutError;
    },
  });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Timeout verificando el pago" });
});

test("no activa approved con moneda incorrecta", async () => {
  const { res, supabase } = await ejecutarWebhook({
    fetchImpl: fetchPago({ ...validPayment, currency_id: "USD" }).fetchImpl,
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "moneda_invalida" });
  assert.equal(supabase.state.updates.length, 0);
});

test("no activa approved con monto incorrecto", async () => {
  for (const transaction_amount of [98, 100]) {
    const { res, supabase } = await ejecutarWebhook({
      fetchImpl: fetchPago({ ...validPayment, transaction_amount }).fetchImpl,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: "monto_invalido" });
    assert.equal(supabase.state.updates.length, 0);
  }
});

test("no activa approved sin external_reference", async () => {
  const { res, supabase } = await ejecutarWebhook({
    fetchImpl: fetchPago({ ...validPayment, external_reference: "" }).fetchImpl,
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "sin_referencia" });
  assert.equal(supabase.state.updates.length, 0);
});

test("no activa approved con usuario inexistente", async () => {
  const supabase = crearSupabaseMock({ userExists: false });
  const { res } = await ejecutarWebhook({ supabase });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "usuario_inexistente" });
  assert.equal(supabase.state.updates.length, 0);
});

test("activa VIP con pago approved valido", async () => {
  const { calls, fetchImpl } = fetchPago();
  const { res, supabase } = await ejecutarWebhook({ fetchImpl });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "vip_activado" });
  assert.equal(calls[0].url, `https://api.mercadopago.com/v1/payments/${paymentId}`);
  assert.deepEqual(supabase.state.updates[0], {
    plan: "vip",
    creditos_reset_at: "2026-08-10T12:00:00.000Z",
    vip_expires_at: "2026-09-09T12:00:00.000Z",
    generaciones_estaticos: 0,
    generaciones_video: 0,
    analisis_realizados: 0,
    recordatorio_vip_enviado_at: null,
  });
  assert.deepEqual(supabase.state.inserts[0], {
    payment_id: String(paymentId),
    clerk_id: validPayment.external_reference,
    monto: 99,
  });
});

test("ackea payment_id ya procesado sin consultar MercadoPago ni activar", async () => {
  const supabase = crearSupabaseMock({ processed: true });
  const { res } = await ejecutarWebhook({
    supabase,
    fetchImpl: async () => {
      throw new Error("no debe llamar MercadoPago");
    },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "ya_procesado" });
  assert.equal(supabase.state.updates.length, 0);
});

test("devuelve 500 si falla el update de usuario", async () => {
  const supabase = crearSupabaseMock({
    updateError: { message: "update failed" },
  });
  const { res } = await ejecutarWebhook({ supabase });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "No se pudo activar el plan" });
  assert.equal(supabase.state.inserts.length, 0);
});

test("devuelve 500 si el update no afecta al usuario esperado", async () => {
  const supabase = crearSupabaseMock({ updateAffected: false });
  const { res } = await ejecutarWebhook({ supabase });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "No se pudo confirmar la activacion" });
  assert.equal(supabase.state.inserts.length, 0);
});

test("devuelve 500 si falla el registro en pagos_procesados", async () => {
  const supabase = crearSupabaseMock({
    insertError: { message: "insert failed" },
  });
  const { res } = await ejecutarWebhook({ supabase });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "No se pudo registrar el pago" });
  assert.equal(supabase.state.updates.length, 1);
});
