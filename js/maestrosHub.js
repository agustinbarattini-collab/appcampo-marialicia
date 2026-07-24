import {
  lotesView,
  corredoresView,
  silosBolsaView,
  proveedoresView,
  contratistasView,
  insumosView,
} from "./maestros.js";

const subViews = {
  lotes: { view: lotesView, label: "Lotes" },
  silos: { view: silosBolsaView, label: "Silos Bolsa" },
  corredores: { view: corredoresView, label: "Corredores" },
  insumos: { view: insumosView, label: "Insumos" },
  proveedores: { view: proveedoresView, label: "Proveedores" },
  contratistas: { view: contratistasView, label: "Contratistas" },
};

const maestrosHubView = {
  async render(container, sub) {
    const activeKey = sub && subViews[sub] ? sub : "lotes";
    container.innerHTML = `
      <div class="subtabs" id="subtabs"></div>
      <div id="subContent"></div>
    `;
    const subtabs = container.querySelector("#subtabs");
    subtabs.innerHTML = Object.entries(subViews)
      .map(
        ([key, v]) =>
          `<a href="#maestros/${key}" class="subtab ${key === activeKey ? "active" : ""}">${v.label}</a>`
      )
      .join("");
    const subContent = container.querySelector("#subContent");
    await subViews[activeKey].view.render(subContent);
  },
};

export { maestrosHubView };
