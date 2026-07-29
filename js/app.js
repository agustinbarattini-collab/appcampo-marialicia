import { cargaGranosView } from "./cargaGranos.js";
import { movimientosInsumosView } from "./movimientosInsumos.js";
import { aplicacionesFitosanitariosView } from "./aplicacionesFitosanitarios.js";
import { siembraView } from "./siembra.js";
import { maestrosHubView } from "./maestrosHub.js";
import { APP_CONFIG } from "./config.js";
import { syncAll, pullAll, contarPendientes } from "./sync.js";

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
  await pullAll();
  await updateSyncStatus();
  // Refresca la vista actual por si trajo datos nuevos de otros dispositivos.
  await router();
}

// Versión liviana: solo sube lo pendiente y actualiza el badge, sin traer datos
// de otros dispositivos ni redibujar la pantalla (para no pisar un formulario
// que el usuario ya empezó a llenar de nuevo). Se dispara justo después de
// guardar cualquier registro, además del sync completo en reconexión/apertura.
async function syncNow() {
  await syncAll();
  await updateSyncStatus();
}

window.addEventListener("appcampo-sync-now", syncNow);

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
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => {
        // Revisa si hay una versión nueva publicada cada vez que la app
        // vuelve a primer plano (no solo al abrirla desde cero).
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update();
        });
      })
      .catch((err) => {
        console.warn("No se pudo registrar el service worker:", err);
      });

    // El service worker usa skipWaiting()+clients.claim(), así que apenas
    // una versión nueva termina de activarse toma el control de la página
    // sola. Cuando eso pasa, recargamos para que se vea la versión nueva
    // sin depender de que el usuario cierre y reabra la app a mano.
    let recargandoPorActualizacion = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargandoPorActualizacion) return;
      recargandoPorActualizacion = true;
      location.reload();
    });
  }

  updateOnlineBadge();
  if (navigator.onLine) runSync();
});
