import { verificarAuth } from "./middleware.js";
import { createClient } from "@supabase/supabase-js";
import { resolverCicloCreditos } from "./_cicloCreditos.js";

// Límite de análisis del plan VIP por ciclo mensual.
// Mantener alineado con PLANES.vip.analisis en src/utils/constants.js.
const LIMITE_ANALISIS_VIP = 6;

// ════════════════════════════════════════════════════════════════════
//  UMBRALES DE DECISIÓN  (única fuente de verdad — ajustar solo aquí)
//  Todo lo de CPA es RELATIVO a la baseline de la cuenta, no en moneda fija.
// ════════════════════════════════════════════════════════════════════
const FACTOR_MALO = 1.5; // cpa7d > max(cpaMes, baseline) × esto → apagar
const TOLERANCIA_HIST = 1.2; // histórico "bueno" = cpaMes ≤ baseline × esto
const FACTOR_EXCELENTE = 0.8; // cpa7d ≤ baseline × esto → escala aunque sea nuevo/estable
const MIN_RES = 5; // conversiones mínimas para juzgar (universal, no moneda)
const MIN_RES_REVIVIR = 3; // histórico mínimo (conversiones) para considerar revivir
const ZOMBI_RATIO = 0.1; // gastó < 10% del esperado → Meta dejó de entregar
const FRECUENCIA_FATIGA = 2.0;
const FRECUENCIA_ALERTA = 1.8;
const FRECUENCIA_PREDICTIVA_MIN = 1.5;
const CTR_BAJO = 1.0; // CTR < 1% = débil (umbral de plataforma)
const HOOK_BUENO = 0.25; // stop rate > 25% = buen gancho
const HOOK_OK = 0.15; // 15-25% aceptable

const MAX_CHARS = 60000;

// ─── Moneda: detectar del header, no asumir ───
const SIMBOLOS_MONEDA = {
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
const detectarMoneda = (headerLine) => {
  const m = headerLine.match(/Importe gastado\s*\(\s*([A-Za-z]{3})\s*\)/);
  return m ? m[1].toUpperCase() : "PEN";
};
const hacerFormateador = (moneda) => (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  const sim = SIMBOLOS_MONEDA[moneda];
  return sim
    ? `${sim} ${Number(n).toFixed(2)}`
    : `${moneda} ${Number(n).toFixed(2)}`;
};

// ─── Objetivo: detectar del "Indicador de resultado", no asumir ───
const OBJETIVOS = [
  {
    match: "messaging",
    label: "conversaciones",
    singular: "conversación",
    debil: false,
  },
  { match: "purchase", label: "ventas", singular: "venta", debil: false },
  { match: "lead", label: "leads", singular: "lead", debil: false },
  {
    match: "complete_registration",
    label: "registros",
    singular: "registro",
    debil: false,
  },
  {
    match: "app_install",
    label: "instalaciones",
    singular: "instalación",
    debil: false,
  },
  {
    match: "landing_page",
    label: "visitas a la página",
    singular: "visita",
    debil: true,
  },
  { match: "link_click", label: "clics", singular: "clic", debil: true },
];
const OBJETIVO_DEFAULT = {
  label: "resultados",
  singular: "resultado",
  debil: false,
};
const detectarObjetivo = (indicadores) => {
  const conteo = {};
  indicadores.forEach((i) => {
    const s = (i || "").toLowerCase();
    if (s) conteo[s] = (conteo[s] || 0) + 1;
  });
  const dominante =
    Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0] || "";
  return OBJETIVOS.find((o) => dominante.includes(o.match)) || OBJETIVO_DEFAULT;
};

// ─── Validación de CSV ───
const sanitizarContenido = (raw) =>
  raw.substring(0, MAX_CHARS).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

const validarEstructuraCSV = (contenido) => {
  const lineas = contenido.split("\n").filter((l) => l.trim());
  if (lineas.length < 2) return false;
  return lineas[0].split(",").length >= 2;
};

// ─── Parse robusto (quote-aware), por nombre de columna ───
const parsearLinea = (linea) => {
  const out = [];
  let cur = "",
    q = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (q && linea[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const parsearFecha = (str) => {
  if (!str) return null;
  const s = str.replace(/"/g, "").trim();
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  return null;
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const ent = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

// ════════════════════════════════════════════════════════════════════
//  PARSEO POR ANUNCIO
// ════════════════════════════════════════════════════════════════════
const parsearReporte = (contenido) => {
  const lineas = contenido.split("\n").filter((l) => l.trim());
  if (lineas.length < 2)
    return {
      anuncios: [],
      periodo: {},
      periodoDias: 7,
      tieneVideo: false,
      indicadores: [],
    };

  const headers = parsearLinea(lineas[0]).map((h) =>
    h.replace(/"/g, "").trim(),
  );
  const find = (frag) => {
    let i = headers.indexOf(frag);
    if (i !== -1) return i;
    return headers.findIndex((h) =>
      h.toLowerCase().includes(frag.toLowerCase()),
    );
  };

  const idx = {
    nombre: find("Nombre del anuncio"),
    entrega: find("Entrega del anuncio"),
    resultados: find("Resultados"),
    indicador: find("Indicador de resultado"),
    cpaCol: find("Costo por resultados"),
    gasto: find("Importe gastado"),
    presupuesto: find("Presupuesto del conjunto"),
    tipoPresupuesto: find("Tipo de presupuesto"),
    impresiones: find("Impresiones"),
    ctr: find("CTR único"),
    clics: find("Clics únicos"),
    frecuencia: find("Frecuencia"),
    cpm: find("CPM"),
    fechaCreacion: find("Fecha de creación"),
    inicio: find("Inicio del informe"),
    fin: find("Fin del informe"),
    video3s: find("Reproducciones de video de 3"),
    thruPlays: find("ThruPlay"),
  };

  // Gancho SOLO desde columnas estándar de Meta. No usar columnas calculadas
  // a mano (ej. "STOP RATE"): el usuario real no las tiene en su export.
  const tieneVideo = idx.video3s !== -1 && idx.thruPlays !== -1;

  const primera = parsearLinea(lineas[1]);
  const fInicio = idx.inicio !== -1 ? parsearFecha(primera[idx.inicio]) : null;
  const fFin = idx.fin !== -1 ? parsearFecha(primera[idx.fin]) : null;
  let periodoDias = 7;
  if (fInicio && fFin)
    periodoDias = Math.round((fFin - fInicio) / 864e5) + 1 || 7;

  const indicadores = [];

  const anuncios = lineas.slice(1).map((linea) => {
    const v = parsearLinea(linea);
    const nombre = (v[idx.nombre] || "").replace(/"/g, "").trim();
    const gasto = idx.gasto !== -1 ? num(v[idx.gasto]) : 0;
    const resultados = idx.resultados !== -1 ? ent(v[idx.resultados]) : 0;
    const ind = idx.indicador !== -1 ? (v[idx.indicador] || "").trim() : "";
    if (ind) indicadores.push(ind);

    // CPA: usa el valor que Meta reporta; recalcula solo como fallback.
    // null cuando no hubo resultados → tri-estado (lo resuelve clasificar).
    const cpaMeta = idx.cpaCol !== -1 ? parseFloat(v[idx.cpaCol]) : NaN;
    const cpa =
      resultados > 0
        ? Number.isFinite(cpaMeta) && cpaMeta > 0
          ? cpaMeta
          : gasto > 0
            ? gasto / resultados
            : null
        : null;

    const presupuesto =
      idx.presupuesto !== -1 ? num(v[idx.presupuesto]) || 35 : 35;
    const activo =
      idx.entrega !== -1 &&
      (v[idx.entrega] || "").toLowerCase().includes("active");
    const impresiones = idx.impresiones !== -1 ? ent(v[idx.impresiones]) : 0;
    const ctr = idx.ctr !== -1 ? num(v[idx.ctr]) : null;
    const clics = idx.clics !== -1 ? ent(v[idx.clics]) : 0;
    const frecuencia = idx.frecuencia !== -1 ? num(v[idx.frecuencia]) : null;
    const cpm = idx.cpm !== -1 ? num(v[idx.cpm]) : null;

    // Gancho: solo desde columnas estándar (video3s / ThruPlays) sobre impresiones.
    let stop_rate = null,
      retencion = null;
    if (idx.video3s !== -1 && idx.thruPlays !== -1 && impresiones > 0) {
      stop_rate = num(v[idx.video3s]) / impresiones;
      retencion = num(v[idx.thruPlays]) / impresiones;
    }

    let dias_activos = null,
      gasto_esperado = null;
    if (idx.fechaCreacion !== -1) {
      const fC = parsearFecha(v[idx.fechaCreacion]);
      if (fC) {
        const finRef = fFin || new Date();
        const diff = Math.max(0, Math.floor((finRef - fC) / 864e5));
        dias_activos =
          fInicio && fC < fInicio ? periodoDias : Math.min(periodoDias, diff);
        gasto_esperado = presupuesto * dias_activos;
      }
    }

    return {
      nombre,
      gasto,
      resultados,
      cpa,
      presupuesto,
      activo,
      impresiones,
      ctr,
      clics,
      frecuencia,
      cpm,
      stop_rate,
      retencion,
      dias_activos,
      gasto_esperado,
    };
  });

  return {
    anuncios,
    periodo: {
      inicio: primera[idx.inicio] || null,
      fin: primera[idx.fin] || null,
    },
    periodoDias,
    tieneVideo,
    indicadores,
  };
};

// ════════════════════════════════════════════════════════════════════
//  MOTOR DE CLASIFICACIÓN DETERMINÍSTICO (relativo a la baseline)
// ════════════════════════════════════════════════════════════════════
const clasificar = (rep7, rep30, baseline) => {
  const map30 = new Map();
  rep30.anuncios.forEach((a) => map30.set(a.nombre, a));
  const pisoJuicio = baseline !== null ? baseline : 0;

  return rep7.anuncios.map((a) => {
    const m = map30.get(a.nombre);
    const gastoMes = m ? m.gasto : 0;
    const resMes = m ? m.resultados : 0;
    const ctrMes = m ? m.ctr : null;
    const cpaMes = m ? m.cpa : null;

    // Tri-estado del histórico
    const histBueno =
      cpaMes !== null &&
      resMes >= MIN_RES_REVIVIR &&
      (baseline === null || cpaMes <= baseline * TOLERANCIA_HIST);
    const histMal = cpaMes === null && gastoMes >= (baseline || 1);
    const sinHistorial = cpaMes === null && !histMal;
    const cpaEstado =
      cpaMes !== null ? "real" : histMal ? "mal_historico" : "sin_historial";

    const gastoEsp = a.gasto_esperado;
    const casiSinGasto =
      a.gasto <= 0.000001 ||
      (gastoEsp !== null && gastoEsp > 0 && a.gasto < ZOMBI_RATIO * gastoEsp);

    const cpa7d = a.cpa;
    const cambioCpa =
      cpa7d !== null && cpaMes !== null && cpaMes > 0
        ? ((cpa7d - cpaMes) / cpaMes) * 100
        : null;

    // ── PRECEDENCIA (la primera que se cumple manda) ──
    let bucket;
    if (casiSinGasto) {
      if (histBueno) bucket = "revivir";
      else if (sinHistorial && a.gasto > 0 && a.resultados < MIN_RES)
        bucket = "datos_insuficientes";
      else bucket = "cola";
    } else if (a.resultados < MIN_RES && a.gasto < pisoJuicio) {
      bucket = "datos_insuficientes";
    } else if (
      a.gasto >= pisoJuicio &&
      a.resultados >= MIN_RES &&
      cpa7d !== null &&
      // Mejora real vs su propio histórico…
      ((cpaMes !== null &&
        cpa7d < cpaMes &&
        (baseline === null || cpa7d <= baseline)) ||
        // …o CPA muy por debajo del baseline de la cuenta (escala aunque sea
        //   nuevo o estable), siempre que no se esté deteriorando vs su histórico.
        (baseline !== null &&
          cpa7d <= baseline * FACTOR_EXCELENTE &&
          (cpaMes === null || cpa7d <= cpaMes)))
    ) {
      bucket = "escalar";
    } else if (
      a.gasto >= pisoJuicio &&
      (a.resultados === 0 ||
        (cpa7d !== null &&
          cpaMes !== null &&
          baseline !== null &&
          cpa7d > Math.max(cpaMes, baseline) * FACTOR_MALO))
    ) {
      bucket = "apagar";
    } else {
      bucket = "mantener";
    }

    // ── Señales creativas ──
    const ctrCae = ctrMes !== null && a.ctr !== null ? a.ctr < ctrMes : false;
    const fatiga =
      (a.frecuencia !== null && a.frecuencia > FRECUENCIA_FATIGA && ctrCae) ||
      (a.frecuencia !== null &&
        a.frecuencia > FRECUENCIA_ALERTA &&
        a.resultados === 0 &&
        a.gasto > 0);
    const fatigaPredictiva =
      !fatiga &&
      a.activo &&
      a.frecuencia !== null &&
      a.frecuencia >= FRECUENCIA_PREDICTIVA_MIN &&
      a.frecuencia <= FRECUENCIA_FATIGA;
    const ctrBajo = a.ctr !== null && a.ctr < CTR_BAJO && a.gasto >= pisoJuicio;

    const flagsFatiga = [];
    if (fatiga) flagsFatiga.push("fatiga");
    if (fatigaPredictiva) flagsFatiga.push("fatiga_predictiva");
    if (ctrBajo) flagsFatiga.push("ctr_bajo");

    return {
      ...a,
      gastoMes,
      resMes,
      ctrMes,
      cpaMes,
      cpaEstado,
      histBueno,
      histMal,
      sinHistorial,
      casiSinGasto,
      cpa7d,
      cambioCpa,
      bucket,
      fatiga,
      fatigaPredictiva,
      ctrBajo,
      flagsFatiga,
    };
  });
};

// ════════════════════════════════════════════════════════════════════
//  ENSAMBLA EL CONTRATO DE SALIDA (determinístico, sin LLM)
// ════════════════════════════════════════════════════════════════════
const construirSalida = (registros, rep7, rep30, ctx) => {
  const { fmt, objetivo, baseline } = ctx;
  const r2 = (n) =>
    n === null || n === undefined ? null : Number(Number(n).toFixed(2));

  // ── Motivos (prosa determinística, con moneda + objetivo del contexto) ──
  const motivo = (r) => {
    switch (r.bucket) {
      case "escalar":
        if (r.cpaMes !== null && r.cpa7d < r.cpaMes)
          return `CPA reciente de ${fmt(r.cpa7d)}, mejor que tu histórico de ${fmt(r.cpaMes)}, con volumen suficiente (${r.resultados} ${objetivo.label}). Sube el presupuesto poco a poco (15–20%) en el mismo conjunto.`;
        return `CPA reciente de ${fmt(r.cpa7d)}, muy por debajo de tu referencia de cuenta (${fmt(baseline)}), con volumen suficiente (${r.resultados} ${objetivo.label}). Sube el presupuesto poco a poco (15–20%) en el mismo conjunto.`;
      case "revivir":
        return `Funcionaba bien (${r.resMes} ${objetivo.label} a ${fmt(r.cpaMes)}) y Meta dejó de entregarlo. Reactívalo en un conjunto de anuncios nuevo para que vuelva a entrar en la subasta.`;
      case "apagar":
        return r.resultados === 0
          ? `Gastó ${fmt(r.gasto)} sin generar ${objetivo.label} en el período. Libera ese presupuesto hacia anuncios que sí rinden.`
          : `Gastó ${fmt(r.gasto)} con un CPA de ${fmt(r.cpa7d)}, muy por encima de tu referencia de ${fmt(baseline)}. Libera ese presupuesto hacia anuncios que sí rinden.`;
      case "cola":
        return r.histMal
          ? `Gastó ${fmt(r.gastoMes)} en el mes sin generar ${objetivo.label}; no tiene un histórico rentable que justifique reactivarlo.`
          : `Sin gasto ni ${objetivo.label} recientes, ni un histórico relevante. Déjalo en cola o archívalo.`;
      case "datos_insuficientes": {
        const d =
          r.dias_activos !== null ? `${r.dias_activos} día(s)` : "el período";
        return `Gasto de ${fmt(r.gasto)} y ${r.resultados} ${objetivo.label} en ${d} — aún no hay datos suficientes para juzgarlo. Déjalo correr unos días más antes de decidir.`;
      }
      default: {
        if (
          r.cpa7d !== null &&
          r.cpaMes !== null &&
          r.cpa7d > r.cpaMes &&
          r.cpa7d <= baseline
        )
          return `CPA reciente (${fmt(r.cpa7d)}) aún rentable pero peor que tu histórico (${fmt(r.cpaMes)}). Mantén y observa; evita escalar hacia una tendencia que empeora.`;
        if (r.cpa7d !== null && r.cpa7d <= baseline && r.resultados < MIN_RES)
          return `Buen CPA (${fmt(r.cpa7d)}) pero poco volumen (${r.resultados} ${objetivo.label}) para escalar con confianza. Mantén y sigue acumulando datos.`;
        if (r.cpa7d !== null && r.cpa7d <= baseline)
          return `CPA reciente (${fmt(r.cpa7d)}) en buen rango, pero sin una mejora confirmada vs tu histórico que justifique subir presupuesto. Mantén y acumula más datos.`;
        if (r.cpa7d !== null)
          return `CPA reciente (${fmt(r.cpa7d)}) aceptable pero por encima de tu referencia de ${fmt(baseline)}. Mantén y observa; evita cambios bruscos.`;
        return `Rendimiento estable sin deterioro claro. Mantén y observa.`;
      }
    }
  };

  const aAnuncio = (r) => ({
    nombre: r.nombre,
    bucket: r.bucket,
    cpaEstado: r.cpaEstado,
    gasto7d: r2(r.gasto),
    resultados7d: r.resultados,
    cpa7d: r2(r.cpa7d),
    cpaMes: r2(r.cpaMes),
    cambioCpa: r.cambioCpa !== null ? Number(r.cambioCpa.toFixed(0)) : null,
    entrega: r.activo ? "active" : "inactive",
    diasActivos: r.dias_activos,
    presupuesto: r2(r.presupuesto),
    metricas: {
      ctr: r.ctr !== null ? r2(r.ctr) : null,
      frecuencia: r.frecuencia !== null ? r2(r.frecuencia) : null,
      cpm: r.cpm !== null ? r2(r.cpm) : null,
    },
    flagsFatiga: r.flagsFatiga,
    motivo: motivo(r),
  });

  const buckets = {
    escalar: [],
    revivir: [],
    apagar: [],
    mantener: [],
    cola: [],
    datos_insuficientes: [],
  };
  registros.forEach((r) => buckets[r.bucket].push(aAnuncio(r)));

  // ── Panorama ──
  const gastoTotal7d = registros.reduce((s, r) => s + r.gasto, 0);
  const resultados7d = registros.reduce((s, r) => s + r.resultados, 0);
  const gastoRentable = registros
    .filter((r) => r.cpa7d !== null && baseline !== null && r.cpa7d <= baseline)
    .reduce((s, r) => s + r.gasto, 0);
  const anunciosActivos = registros.filter(
    (r) => r.activo && r.gasto > 0,
  ).length;

  const panorama = {
    gastoTotal7d: r2(gastoTotal7d),
    resultados7d,
    cpaPromedio7d: resultados7d > 0 ? r2(gastoTotal7d / resultados7d) : null,
    anunciosActivos,
    pctPresupuestoRentable:
      gastoTotal7d > 0 ? Math.round((gastoRentable / gastoTotal7d) * 100) : 0,
  };

  // ── Semáforo de métricas secundarias (sobre activos con gasto) ──
  const act = registros.filter((r) => r.activo && r.gasto > 0);
  const totalClics = act.reduce((s, r) => s + r.clics, 0);
  const totalImpr = act.reduce((s, r) => s + r.impresiones, 0);
  const ctrComb = totalImpr > 0 ? (totalClics / totalImpr) * 100 : 0;
  const freqProm = act.length
    ? act.reduce((s, r) => s + (r.frecuencia || 0), 0) / act.length
    : 0;
  const cpmProm = act.length
    ? act.reduce((s, r) => s + (r.cpm || 0), 0) / act.length
    : 0;
  const semCtr = ctrComb < 1 ? "rojo" : ctrComb <= 2 ? "amarillo" : "verde";
  const semFreq =
    freqProm > 2 ? "rojo" : freqProm >= 1.5 ? "amarillo" : "verde";

  const metricas = {
    ctr: {
      valor: r2(ctrComb),
      estado: semCtr,
      lectura:
        semCtr === "verde"
          ? "El creativo atrae clics de forma saludable."
          : semCtr === "amarillo"
            ? "CTR moderado; funciona pero hay margen de mejora."
            : "CTR bajo; el creativo no está enganchando lo suficiente.",
    },
    frecuencia: {
      valor: r2(freqProm),
      estado: semFreq,
      lectura:
        semFreq === "verde"
          ? "Frecuencia sana; el público aún no está saturado."
          : semFreq === "amarillo"
            ? "Frecuencia en zona de alerta; vigila la fatiga."
            : "Frecuencia alta; riesgo de fatiga del creativo.",
    },
    cpm: {
      valor: r2(cpmProm),
      estado: "neutro",
      lectura:
        "Costo por mil impresiones, como referencia de competencia en la subasta.",
    },
  };

  // ── Fatiga ──
  const fatiga = {
    alertas: registros
      .filter((r) => r.fatiga)
      .map((r) => ({
        nombre: r.nombre,
        frecuencia: r2(r.frecuencia),
        nota:
          r.resultados === 0
            ? `Frecuencia ${r.frecuencia?.toFixed(2)} sin ${objetivo.label} recientes: el creativo está saturado. Reemplázalo.`
            : `Frecuencia ${r.frecuencia?.toFixed(2)} con CTR a la baja vs su histórico: fatiga del creativo. Reemplázalo.`,
      })),
    predictivas: registros
      .filter((r) => r.fatigaPredictiva)
      .map((r) => ({
        nombre: r.nombre,
        frecuencia: r2(r.frecuencia),
        nota: "Frecuencia subiendo hacia el umbral de fatiga (2.0); el CTR suele caer al cruzarlo. Prepara un reemplazo para rotar a tiempo.",
      })),
  };

  // ── Creativos a regenerar (por anuncio, urgencia derivada) ──
  const creativosARegenerar = [];
  registros.forEach((r) => {
    let urgencia = null,
      m = "";
    if (r.bucket === "apagar") {
      urgencia = "alta";
      m = "Gastó sin el retorno esperado; conviene reemplazar el creativo.";
    } else if (r.fatiga) {
      urgencia = "alta";
      m = "Señales de fatiga del creativo; refréscalo cuanto antes.";
    } else if (r.fatigaPredictiva) {
      urgencia = "media";
      m = "Frecuencia acercándose al umbral de fatiga; prepara un reemplazo.";
    } else if (r.ctrBajo) {
      urgencia = "baja";
      m = "CPA aceptable pero CTR bajo; el gancho puede mejorar.";
    }
    if (urgencia)
      creativosARegenerar.push({ nombre: r.nombre, urgencia, motivo: m });
  });

  // ── Hook (solo desde columnas estándar de video; nunca rompe, siempre informa) ──
  let hook;
  if (!rep7.tieneVideo) {
    hook = {
      disponible: false,
      mensaje:
        "Para ver el análisis de gancho de tus videos, agrega las columnas “Reproducciones de video de 3 segundos” y “ThruPlays” al exportar desde Meta Ads. Mira el tutorial.",
    };
  } else {
    const videos = registros.filter(
      (r) => r.stop_rate !== null && r.stop_rate > 0 && r.impresiones > 1000,
    );
    if (videos.length === 0) {
      hook = {
        disponible: false,
        mensaje:
          "No se detectaron videos con datos de gancho en este período. Si corriste anuncios en video, asegúrate de incluir las columnas “Reproducciones de video de 3 segundos” y “ThruPlays” al exportar. Mira el tutorial.",
      };
    } else {
      const srProm =
        videos.reduce((s, r) => s + r.stop_rate, 0) / videos.length;
      const retProm =
        videos.reduce((s, r) => s + (r.retencion || 0), 0) / videos.length;
      const estado =
        srProm > HOOK_BUENO ? "verde" : srProm >= HOOK_OK ? "amarillo" : "rojo";
      hook = {
        disponible: true,
        stopRatePromedio: Number((srProm * 100).toFixed(1)),
        retencionPromedio: Number((retProm * 100).toFixed(1)),
        estado,
        lectura:
          estado === "verde"
            ? "Los primeros 3 segundos retienen bien al público."
            : estado === "amarillo"
              ? "El gancho funciona pero hay margen para abrir más fuerte."
              : "El gancho de los primeros 3 segundos pierde a la mayoría; refuerza el inicio.",
        anuncios: videos.map((r) => ({
          nombre: r.nombre,
          stopRate: Number((r.stop_rate * 100).toFixed(1)),
          retencion:
            r.retencion !== null
              ? Number((r.retencion * 100).toFixed(1))
              : null,
          diagnostico:
            r.stop_rate > HOOK_BUENO
              ? "Buen gancho inicial."
              : r.stop_rate >= HOOK_OK
                ? "Gancho aceptable, mejorable."
                : "Gancho débil en los primeros 3 segundos.",
        })),
      };
    }
  }

  return {
    panorama,
    buckets,
    metricas,
    fatiga,
    hook,
    creativosARegenerar,
    disclaimer:
      "Este análisis es una foto del período exportado. Las referencias se calculan sobre el propio desempeño de tu cuenta, no son una garantía: dependen de tu nicho, oferta y momento del mercado. Úsalo como apoyo — el mejor filtro es tu criterio.",
  };
};

// ════════════════════════════════════════════════════════════════════
//  NARRATIVA (LLM) — solo resumenEjecutivo, ensenanza, patronesGanadores
// ════════════════════════════════════════════════════════════════════
const narrativaFallback = (salida, ctx) => {
  const p = salida.panorama,
    obj = ctx.objetivo,
    fmt = ctx.fmt;
  const topEscalar = salida.buckets.escalar
    .slice(0, 5)
    .map((e) => e.nombre)
    .join(", ");
  return {
    resumenEjecutivo: [
      `En los últimos 7 días se registraron ${p.resultados7d} ${obj.label} con un gasto de ${fmt(p.gastoTotal7d)} y un CPA promedio de ${fmt(p.cpaPromedio7d)}.`,
      salida.buckets.escalar.length
        ? `Listos para escalar por su buen CPA reciente: ${topEscalar}.`
        : `Ningún anuncio cumple aún las condiciones para escalar con confianza.`,
      salida.buckets.revivir.length
        ? `${salida.buckets.revivir.length} anuncio(s) con buen historial dejaron de entregarse: candidatos a revivir.`
        : `Sin anuncios con historial rentable para revivir.`,
      salida.buckets.apagar.length
        ? `${salida.buckets.apagar.length} anuncio(s) gastaron sin el retorno esperado: candidatos a apagar.`
        : `Sin anuncios con gasto significativo y CPA alto para apagar.`,
      `${salida.buckets.cola.length} en cola y ${salida.buckets.datos_insuficientes.length} aún sin datos suficientes para decidir.`,
    ],
    ensenanza:
      "Protege a los ganadores subiendo presupuesto despacio, corta solo lo que gastó sin convertir y revive con criterio (1 o 2 por semana) para no abrir demasiados frentes a la vez.",
    patronesGanadores: [],
  };
};

const generarNarrativa = async (salida, ctx) => {
  const fallback = narrativaFallback(salida, ctx);
  if (!process.env.OPENAI_API_KEY) return { ...fallback, fuente: "plantilla" };

  const compacto = {
    objetivo: ctx.objetivo.label,
    moneda: ctx.moneda,
    baselineCpa: ctx.baseline,
    panorama: salida.panorama,
    escalar: salida.buckets.escalar.map((e) => ({
      a: e.nombre,
      cpa7d: e.cpa7d,
      cpaMes: e.cpaMes,
      res: e.resultados7d,
    })),
    mantener: salida.buckets.mantener.map((e) => ({
      a: e.nombre,
      cpa7d: e.cpa7d,
    })),
    revivir: salida.buckets.revivir.map((e) => ({
      a: e.nombre,
      cpaMes: e.cpaMes,
    })),
    apagar: salida.buckets.apagar.map((e) => ({ a: e.nombre })),
    cola_count: salida.buckets.cola.length,
    datos_insuf_count: salida.buckets.datos_insuficientes.length,
  };

  const system = `Eres un consultor senior de Meta Ads para dueños de negocio de cualquier rubro. Recibes un análisis YA CLASIFICADO; las decisiones ya están tomadas por el sistema. Tu única tarea es REDACTAR tres campos narrativos, sin cambiar ninguna clasificación ni inventar números que no estén en los datos. El objetivo optimizado es "${ctx.objetivo.label}" y la moneda es ${ctx.moneda}. Responde SOLO con JSON válido, sin texto adicional ni comillas de código. Español peruano/neutro.`;

  const userPrompt = `Análisis ya clasificado:
${JSON.stringify(compacto, null, 2)}

Devuelve EXACTAMENTE este JSON:
{
  "resumenEjecutivo": ["5 viñetas que resuman QUÉ PASÓ en el período, usando solo los números de arriba"],
  "ensenanza": "Una lección estratégica clave en 2-3 oraciones.",
  "patronesGanadores": [
    { "descripcion": "patrón común entre los anuncios de escalar/mantener", "insight": "recomendación accionable" }
  ]
}
Reglas: máximo 3 patrones (o [] si no hay ganadores suficientes). No menciones anuncios que no estén en las listas. No cambies categorías.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0,
        max_tokens: 2000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const d = await r.json();
    const texto = d.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(
      texto
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );
    return {
      resumenEjecutivo:
        Array.isArray(parsed.resumenEjecutivo) && parsed.resumenEjecutivo.length
          ? parsed.resumenEjecutivo
          : fallback.resumenEjecutivo,
      ensenanza: parsed.ensenanza || fallback.ensenanza,
      patronesGanadores: Array.isArray(parsed.patronesGanadores)
        ? parsed.patronesGanadores
        : [],
      fuente: "llm",
    };
  } catch (err) {
    console.error("⚠️ Narrativa LLM falló, usando plantilla:", err.message);
    return { ...fallback, fuente: "plantilla" };
  }
};

// ════════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Auth (Clerk / JWT Supabase) → clerkId ──
  const auth = await verificarAuth(req);
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }
  const clerkId = auth.userId;

  // ── Cliente admin (lee plan/contador, escribe incremento) ──
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  // ── Leer usuario: plan, contador, fecha de ciclo ──
  const { data: usuario, error: errUser } = await supabaseAdmin
    .from("usuarios")
    .select(
      "plan, generaciones_estaticos, generaciones_video, analisis_realizados, creditos_reset_at",
    )
    .eq("clerk_id", clerkId)
    .single();

  if (errUser || !usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  // ── Gate VIP ──
  if (usuario.plan !== "vip") {
    return res.status(403).json({
      error: "El análisis de campañas está disponible solo en el plan VIP.",
      code: "PLAN_REQUERIDO",
    });
  }

  // ── Reset mensual perezoso (helper compartido = fuente única de verdad) ──
  // Solo VIP; cera los 3 contadores si el ciclo (≥30 días) venció con un
  // creditos_reset_at real. Si reset_at es null, lo ancla a ahora SIN cerar.
  const ciclo = await resolverCicloCreditos(supabaseAdmin, clerkId, usuario);
  const analisisUsados = ciclo.stats.analisis_realizados;

  // ── Gate límite ──
  if (analisisUsados >= LIMITE_ANALISIS_VIP) {
    return res.status(429).json({
      error: `Alcanzaste tu límite de ${LIMITE_ANALISIS_VIP} análisis de este ciclo. Se renueva al inicio de tu próximo mes.`,
      code: "LIMITE_ALCANZADO",
    });
  }

  try {
    const { contenido7d, contenido30d } = req.body;

    if (!contenido7d || !contenido30d) {
      return res
        .status(400)
        .json({ error: "Se requieren ambos reportes (7 días y 30 días)" });
    }
    if (
      !validarEstructuraCSV(contenido7d) ||
      !validarEstructuraCSV(contenido30d)
    ) {
      return res.status(400).json({
        error:
          "Los archivos no parecen CSV válidos. Sube los reportes en formato CSV con encabezados.",
      });
    }

    const csv7d = sanitizarContenido(contenido7d);
    const csv30d = sanitizarContenido(contenido30d);

    // 1) Parseo
    const rep7 = parsearReporte(csv7d);
    const rep30 = parsearReporte(csv30d);

    if (rep7.anuncios.length === 0) {
      return res.status(400).json({
        error:
          "No se detectaron anuncios en el reporte de 7 días. Verifica el formato del CSV.",
      });
    }

    // 2) Contexto de cuenta: moneda, objetivo, baseline (todo relativo/detectado)
    const header7 = csv7d.split("\n")[0] || "";
    const moneda = detectarMoneda(header7);
    const objetivo = detectarObjetivo(
      rep30.indicadores.concat(rep7.indicadores),
    );
    const gasto30 = rep30.anuncios.reduce((s, a) => s + a.gasto, 0);
    const res30 = rep30.anuncios.reduce((s, a) => s + a.resultados, 0);
    const baseline = res30 > 0 ? gasto30 / res30 : null;
    const fmt = hacerFormateador(moneda);

    // 3) Clasificación determinística
    const registros = clasificar(rep7, rep30, baseline);

    // 4) Ensamblado del contrato
    const ctx = { fmt, moneda, objetivo, baseline };
    const salida = construirSalida(registros, rep7, rep30, ctx);

    // 5) Narrativa (LLM solo 3 campos; nunca rompe el análisis)
    const narrativa = await generarNarrativa(salida, ctx);

    // 6) Incremento del contador (solo tras éxito; read-then-write, igual que el patrón n8n)
    const nuevoTotal = analisisUsados + 1;
    await supabaseAdmin
      .from("usuarios")
      .update({ analisis_realizados: nuevoTotal })
      .eq("clerk_id", clerkId);

    const meta = {
      moneda,
      objetivo: objetivo.label,
      objetivoSingular: objetivo.singular,
      objetivoDebil: objetivo.debil,
      periodo7d: rep7.periodo,
      periodo30d: rep30.periodo,
      baselineCpa: baseline !== null ? Number(baseline.toFixed(2)) : null,
      totalAnuncios: registros.length,
      analisisUsados: nuevoTotal,
      analisisLimite: LIMITE_ANALISIS_VIP,
    };

    console.log(
      `✅ Análisis OK · ${registros.length} anuncios · ${objetivo.label} · ${moneda} · ${nuevoTotal}/${LIMITE_ANALISIS_VIP} · narrativa: ${narrativa.fuente}`,
    );

    return res.status(200).json({
      meta,
      ...salida,
      narrativa,
    });
  } catch (err) {
    console.error("Error en analisis:", err);
    return res
      .status(500)
      .json({ error: "Error generando análisis. Intenta de nuevo." });
  }
}
