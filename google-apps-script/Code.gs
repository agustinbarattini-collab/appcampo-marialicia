/**
 * Backend de sincronización para App de Campo.
 * Se pega en el editor de Apps Script de una Google Sheet (Extensiones → Apps Script)
 * y se despliega como Web App. Ver DUPLICAR.md para el paso a paso completo.
 */

// Reemplazar por un texto random propio (no hace falta recordarlo, solo copiarlo a config.js).
const SHARED_SECRET = "REEMPLAZAR_CON_UN_TOKEN_SECRETO";

const SHEETS = {
  cargaGranos: {
    name: "Carga de Granos",
    headers: [
      "id", "fecha", "origenTipo", "origenNombre", "cultivo", "ctg", "chofer", "patente",
      "corredorNombre", "kgBrutos", "tara", "kgNeto", "humedad", "gpsLat", "gpsLng",
      "observaciones", "fechaCreacionRegistro", "fechaSincronizacion",
    ],
  },
  movimientoInsumo: {
    name: "Movimientos Insumos",
    headers: [
      "id", "tipo", "fecha", "proveedorNombre", "ordenTrabajoNombre", "contratistaNombre",
      "insumoNombre", "unidad", "cantidad", "observaciones", "fechaCreacionRegistro",
      "fechaSincronizacion",
    ],
  },
  aplicacionFitosanitaria: {
    name: "Fitosanitarios",
    headers: [
      "id", "fecha", "contratistaNombre", "loteNombre", "hectareas",
      "producto1Nombre", "producto1Cantidad", "producto1Unidad",
      "producto2Nombre", "producto2Cantidad", "producto2Unidad",
      "producto3Nombre", "producto3Cantidad", "producto3Unidad",
      "producto4Nombre", "producto4Cantidad", "producto4Unidad",
      "producto5Nombre", "producto5Cantidad", "producto5Unidad",
      "comentarios", "fechaCreacionRegistro", "fechaSincronizacion",
    ],
  },
  avanceSiembra: {
    name: "Avance Siembra",
    headers: [
      "id", "fecha", "loteNombre", "cultivo", "hasSembradas", "comentarios", "marcaCierre",
      "fechaCreacionRegistro", "fechaSincronizacion",
    ],
  },
  cierreSiembra: {
    name: "Cierres Siembra",
    headers: [
      "id", "fecha", "loteNombre", "cultivo", "semillaKg", "semillaVariedad", "semillaBolsas",
      "semillaHibrido", "fertilizanteKg", "fertilizanteTipo", "comentarios",
      "fechaCreacionRegistro", "fechaSincronizacion",
    ],
  },
};

/**
 * Correr esta función UNA vez desde el editor (▶) para crear las pestañas con sus
 * encabezados. Google va a pedir autorización la primera vez: es normal, hay que
 * aceptar (la app es tuya, solo actúa sobre esta planilla).
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (key) {
    const cfg = SHEETS[key];
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = ss.insertSheet(cfg.name);
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.setFrozenRows(1);
  });
  ["Hoja 1", "Sheet1"].forEach(function (n) {
    const s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== SHARED_SECRET) {
      return respond({ ok: false, error: "token inválido" });
    }
    const cfg = SHEETS[body.tipo];
    if (!cfg) {
      return respond({ ok: false, error: "tipo desconocido: " + body.tipo });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      setup();
      sheet = ss.getSheetByName(cfg.name);
    }
    const r = body.registro || {};
    const row = cfg.headers.map(function (h) {
      if (h === "fechaSincronizacion") return new Date().toISOString();
      const v = r[h];
      if (v === undefined || v === null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    });
    sheet.appendRow(row);
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
