import { cargaGranosView } from "./cargaGranos.js";
import { movimientosInsumosView } from "./movimientosInsumos.js";
import { aplicacionesFitosanitariosView } from "./aplicacionesFitosanitarios.js";
import { siembraView } from "./siembra.js";
import { maestrosHubView } from "./maestrosHub.js";
import { APP_CONFIG } from "./config.js";
import { syncAll, contarPendientes } from "./sync.js";

const routes = {
  carga: { view: cargaGranosView, label: "Carga de Granos" },
  insumos: { view: movimientosInsumosView, label: "Insumos" },
  fitosanitarios: { view: aplicacionesFitosanitariosView, label: "Fitosanitarios" },
  siembra: { view: siembraView, label: "Siembra" },
  maestros: { view: maestrosHubView, label: "Maestros" },
};

const main = document.getElementById("main");
const tabLinks = document.querySelectorAll("nav.tabbar a");

async function updateSyncStatus() {
  const el = document.getElementById("syncStatus");
  if (!el || !APP_CONFIG.sheetsWebAppUrl) return;
  el.classList.remove("hidden");
  const pendientes = await contarPendientes();
  if (pendientes === 0) {
    el.textContent = "Todo sincronizado";
    el.classList.add("ok");
  } else {
    el.textContent = `${pendientes} pendiente${pendientes === 1 ? "" : "s"} de sincronizar`;
    el.classList.remove("ok");
  }
}

async function runSync() {
  await syncAll();
  await updateSyncStatus();
}

async function router() {
  const hashRaw = (location.hash || "#carga").replace("#", "");
  const [mainKey, subKey] = hashRaw.split("/");
  const route = routes[mainKey] || routes.carga;
  tabLinks.forEach((a) => a.classList.toggle("active", a.dataset.route === mainKey));
  await route.view.render(main, subKey);
  updateSyncStatus();
}

function updateOnlineBadge() {
  const badge = document.getElementById("syncBadge");
  if (!badge) return;
  if (navigator.onLine) {
    badge.textContent = "En línea";
    badge.classList.add("ok");
  } else {
    badge.textContent = "Sin conexión";
    badge.classList.remove("ok");
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("online", () => {
  updateOnlineBadge();
  runSync();
});
window.addEventListener("offline", updateOnlineBadge);

window.addEventListener("DOMContentLoaded", () => {
  document.title = APP_CONFIG.empresaNombre;
  const appTitle = document.getElementById("appTitle");
  if (appTitle) appTitle.textContent = APP_CONFIG.empresaNombre;
  document.documentElement.style.setProperty("--color-primario", APP_CONFIG.colorPrimario);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", APP_CONFIG.colorPrimario);

  router();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("No se pudo registrar el service worker:", err);
    });
  }

  updateOnlineBadge();
  if (navigator.onLine) runSync();
});
