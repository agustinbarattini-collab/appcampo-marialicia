import { dbGetAll, dbPut } from "./db.js";
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

export { syncAll, contarPendientes };
