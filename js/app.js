import { cargaGranosView } from "./cargaGranos.js";
import { movimientosInsumosView } from "./movimientosInsumos.js";
import { aplicacionesFitosanitariosView } from "./aplicacionesFitosanitarios.js";
import { siembraView } from "./siembra.js";
import { maestrosHubView } from "./maestrosHub.js";
import { APP_CONFIG } from "./config.js";

const routes = {
  carga: { view: cargaGranosView, label: "Carga de Granos" },
  insumos: { view: movimientosInsumosView, label: "Insumos" },
  fitosanitarios: { view: aplicacionesFitosanitariosView, label: "Fitosanitarios" },
  siembra: { view: siembraView, label: "Siembra" },
  maestros: { view: maestrosHubView, label: "Maestros" },
};

const main = document.getElementById("main");
const tabLinks = document.querySelectorAll("nav.tabbar a");

async function router() {
  const hashRaw = (location.hash || "#carga").replace("#", "");
  const [mainKey, subKey] = hashRaw.split("/");
  const route = routes[mainKey] || routes.carga;
  tabLinks.forEach((a) => a.classList.toggle("active", a.dataset.route === mainKey));
  await route.view.render(main, subKey);
}

window.addEventListener("hashchange", router);
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

  const updateOnlineBadge = () => {
    const badge = document.getElementById("syncBadge");
    if (!badge) return;
    if (navigator.onLine) {
      badge.textContent = "En línea";
      badge.classList.add("ok");
    } else {
      badge.textContent = "Sin conexión";
      badge.classList.remove("ok");
    }
  };
  window.addEventListener("online", updateOnlineBadge);
  window.addEventListener("offline", updateOnlineBadge);
  updateOnlineBadge();
});
