import { dbGetAll, dbPut, uid } from "./db.js";
import { APP_CONFIG } from "./config.js";

function flattenCarga(r) {
  return {
    ...r,
    gpsLat: r.gps ? r.gps.lat : "",
    gpsLng: r.gps ? r.gps.lng : "",
    foto: undefined,
  };
}

function flattenMovimiento(r) {
  return { ...r, foto: undefined };
}

function flattenAplicacion(r) {
  const out = { ...r };
  (r.productos || []).forEach((p, i) => {
    out[`producto${i + 1}Nombre`] = p.productoNombre;
    out[`producto${i + 1}Cantidad`] = p.cantidad;
    out[`producto${i + 1}Unidad`] = p.unidad;
  });
  out.productos = undefined;
  return out;
}

function flattenAvance(r) {
  return { ...r };
}

function flattenCierre(r) {
  return { ...r };
}

const TIPOS = [
  { store: "cargasGranos", tipo: "cargaGranos", flatten: flattenCarga },
  { store: "movimientosInsumos", tipo: "movimientoInsumo", flatten: flattenMovimiento },
  { store: "aplicacionesFitosanitarios", tipo: "aplicacionFitosanitaria", flatten: flattenAplicacion },
  { store: "avanceSiembra", tipo: "avanceSiembra", flatten: flattenAvance },
  { store: "cierresSiembra", tipo: "cierreSiembra", flatten: flattenCierre },
];

let syncing = false;

async function contarPendientes() {
  let total = 0;
  for (const { store } of TIPOS) {
    const items = await dbGetAll(store);
    total += items.filter((r) => !r.sincronizado).length;
  }
  return total;
}

async function syncAll(onProgress) {
  if (syncing) return;
  if (!navigator.onLine) return;
  if (!APP_CONFIG.sheetsWebAppUrl) return;

  syncing = true;
  try {
    for (const { store, tipo, flatten } of TIPOS) {
      const items = await dbGetAll(store);
      const pendientes = items.filter((r) => !r.sincronizado);
      for (const registro of pendientes) {
        try {
          const res = await fetch(APP_CONFIG.sheetsWebAppUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              token: APP_CONFIG.sheetsSyncToken,
              tipo,
              registro: flatten(registro),
            }),
          });
          const data = await res.json();
          if (data.ok) {
            registro.sincronizado = true;
            await dbPut(store, registro);
          } else {
            console.warn("Sync rechazado por el servidor:", tipo, data.error);
          }
        } catch (err) {
          console.warn("No se pudo sincronizar un registro (sin conexión real o error de red):", tipo, err);
        }
        if (onProgress) await onProgress();
      }
    }
  } finally {
    syncing = false;
  }
  if (onProgress) await onProgress();
}

const MAESTROS_CAMPOS = {
  lotes: ["nombre"],
  corredores: ["nombre"],
  proveedores: ["nombre"],
  contratistas: ["nombre"],
  insumos: ["nombre", "unidad"],
  silosBolsa: ["nombre", "cultivo", "kgTotalInicial"],
};

const MAESTROS_ETIQUETAS = {
  lotes: "Lotes",
  corredores: "Corredores",
  proveedores: "Proveedores",
  contratistas: "Contratistas",
  insumos: "Insumos",
  silosBolsa: "Silos Bolsa",
};

async function importarMaestros() {
  if (!APP_CONFIG.sheetsWebAppUrl) {
    return { ok: false, error: "La sincronización no está configurada." };
  }
  let data;
  try {
    const res = await fetch(APP_CONFIG.sheetsWebAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: APP_CONFIG.sheetsSyncToken, accion: "leerMaestros" }),
    });
    data = await res.json();
  } catch (err) {
    return { ok: false, error: "No se pudo conectar con la planilla: " + err };
  }
  if (!data.ok) {
    return { ok: false, error: data.error || "La planilla rechazó el pedido." };
  }

  const resumen = {};
  for (const [store, campos] of Object.entries(MAESTROS_CAMPOS)) {
    const filas = data.maestros[store] || [];
    const existentes = await dbGetAll(store);
    let nuevos = 0;
    let actualizados = 0;
    for (const fila of filas) {
      const nombre = String(fila.nombre || "").trim();
      if (!nombre) continue;
      const existente = existentes.find((e) => e.nombre.trim().toLowerCase() === nombre.toLowerCase());
      const record = existente ? { ...existente } : { id: uid(), nombre };
      for (const campo of campos) {
        if (campo === "nombre") continue;
        let valor = fila[campo];
        if (campo === "kgTotalInicial") valor = parseFloat(valor) || 0;
        record[campo] = valor;
      }
      await dbPut(store, record);
      if (existente) actualizados++;
      else nuevos++;
    }
    resumen[MAESTROS_ETIQUETAS[store]] = { nuevos, actualizados };
  }
  return { ok: true, resumen };
}

export { syncAll, contarPendientes, importarMaestros };
