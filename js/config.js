const APP_CONFIG = {
  empresaId: "marialicia",
  empresaNombre: "Marialicia",
  colorPrimario: "#273739",
  colorSecundario: "#3f5457",
  // URL del Web App de Google Apps Script (ver DUPLICAR.md). Vacío = sin sincronización.
  sheetsWebAppUrl: "https://script.google.com/macros/s/AKfycbzUXZFPI004MKmysrkTN1Yf0AMvL0Jz5dX1GsvfW5JddTTtIZWJUAZMwIgWUBad4LRaDw/exec",
  // Mismo token que SHARED_SECRET en google-apps-script/Code.gs.
  sheetsSyncToken: "MA-2026",
  // Subir este número fuerza, en cada teléfono, un borrado del caché local
  // (IndexedDB) y una resincronización completa desde cero contra la Sheet
  // — sin que haya que tocar nada a mano en el celular. Se usa cuando se
  // borra o reordena algo grande directo en la Sheet (ej. "arrancar de 0"
  // el stock de Insumos) y hace falta que la app deje de mostrar lo viejo.
  // Ver verificarResetRemoto() en app.js. Dejar en 0 en el uso normal.
  resetVersion: 0,
};

export { APP_CONFIG };
