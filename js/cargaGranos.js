import { dbGetAll, dbGet, dbPut, dbDelete, uid } from "./db.js";
import { getSilosBolsaConStock } from "./stockUtils.js";

const STORE = "cargasGranos";

function nowLocalDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

async function poblarOrigenSelect(select, tipo) {
  select.innerHTML = '<option value="">Seleccionar...</option>';
  if (tipo === "lote") {
    const lotes = (await dbGetAll("lotes")).sort((a, b) => a.nombre.localeCompare(b.nombre));
    for (const l of lotes) {
      select.innerHTML += `<option value="${l.id}">${l.nombre}</option>`;
    }
  } else if (tipo === "silo") {
    const silos = (await getSilosBolsaConStock()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    for (const s of silos) {
      select.innerHTML += `<option value="${s.id}">${s.nombre} — ${s.kgResidual} kg restantes${s.cultivo ? ` (${s.cultivo})` : ""}</option>`;
    }
  }
}

async function poblarCorredorSelect(select) {
  const corredores = (await dbGetAll("corredores")).sort((a, b) => a.nombre.localeCompare(b.nombre));
  select.innerHTML = '<option value="">Seleccionar...</option>' +
    corredores.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
}

function calcularNeto(container) {
  const bruto = parseFloat(container.querySelector("#fBruto").value) || 0;
  const tara = parseFloat(container.querySelector("#fTara").value) || 0;
  const neto = Math.max(0, bruto - tara);
  container.querySelector("#fNeto").textContent = neto.toLocaleString("es-AR");
  return neto;
}

const cargaGranosView = {
  async render(container) {
    const [lotes, silos, corredores] = await Promise.all([
      dbGetAll("lotes"),
      dbGetAll("silosBolsa"),
      dbGetAll("corredores"),
    ]);

    if (lotes.length === 0 && silos.length === 0) {
      container.innerHTML = `
        <h2>Carga de Granos de Campo</h2>
        <div class="card empty-state">
          Todavía no cargaste ningún <strong>Lote</strong> ni <strong>Silo Bolsa</strong>.<br/>
          Andá a la sección Maestros para cargarlos antes de registrar una carga.
        </div>`;
      return;
    }
    if (corredores.length === 0) {
      container.innerHTML = `
        <h2>Carga de Granos de Campo</h2>
        <div class="card empty-state">
          Todavía no cargaste ningún <strong>Corredor</strong> (destino).<br/>
          Andá a la sección Maestros para cargarlo antes de registrar una carga.
        </div>`;
      return;
    }

    container.innerHTML = `
      <h2>Carga de Granos de Campo</h2>
      <div class="card">
        <form id="formCarga">
          <div class="field">
            <label>Fecha y hora</label>
            <input type="datetime-local" id="fFecha" value="${nowLocalDatetime()}" required />
          </div>

          <div class="field">
            <label>Origen</label>
            <div class="row">
              <select id="fOrigenTipo">
                <option value="lote">Lote</option>
                <option value="silo">Silo Bolsa</option>
              </select>
              <select id="fOrigenId" required></select>
            </div>
          </div>

          <div class="field">
            <label>Cultivo</label>
            <input type="text" id="fCultivo" placeholder="Soja, Maíz, Trigo..." required />
          </div>

          <div class="field">
            <label>N° de CTG</label>
            <input type="text" id="fCtg" />
          </div>

          <div class="row">
            <div class="field">
              <label>Chofer</label>
              <input type="text" id="fChofer" />
            </div>
            <div class="field">
              <label>Patente camión/acoplado</label>
              <input type="text" id="fPatente" />
            </div>
          </div>

          <div class="field">
            <label>Destino (Corredor)</label>
            <select id="fCorredorId" required></select>
          </div>

          <div class="row">
            <div class="field">
              <label>Kg brutos</label>
              <input type="number" step="1" id="fBruto" required />
            </div>
            <div class="field">
              <label>Tara camión (kg)</label>
              <input type="number" step="1" id="fTara" required />
            </div>
          </div>
          <div class="field">
            <label>Kg netos (calculado)</label>
            <div class="pill" id="fNeto" style="font-size:1rem;padding:8px 12px;">0</div>
          </div>

          <div class="field">
            <label>Humedad (%)</label>
            <input type="number" step="0.1" id="fHumedad" />
          </div>

          <div class="field">
            <label>Ubicación GPS</label>
            <div class="row">
              <button type="button" class="secondary" id="btnGps">Capturar ubicación</button>
            </div>
            <div class="muted" id="gpsResultado">Sin capturar</div>
          </div>

          <div class="field">
            <label>Foto (opcional)</label>
            <input type="file" accept="image/*" capture="environment" id="fFoto" />
          </div>

          <div class="field">
            <label>Observaciones</label>
            <textarea id="fObs"></textarea>
          </div>

          <div id="stockWarning" class="muted"></div>

          <button type="submit">Guardar carga</button>
        </form>
      </div>

      <div class="card" id="listaCargas"></div>
    `;

    let gps = null;

    const origenTipoSel = container.querySelector("#fOrigenTipo");
    const origenIdSel = container.querySelector("#fOrigenId");
    await poblarOrigenSelect(origenIdSel, origenTipoSel.value);
    origenTipoSel.addEventListener("change", () => poblarOrigenSelect(origenIdSel, origenTipoSel.value));

    await poblarCorredorSelect(container.querySelector("#fCorredorId"));

    container.querySelector("#fBruto").addEventListener("input", () => calcularNeto(container));
    container.querySelector("#fTara").addEventListener("input", () => calcularNeto(container));

    container.querySelector("#btnGps").addEventListener("click", () => {
      const resultado = container.querySelector("#gpsResultado");
      if (!navigator.geolocation) {
        resultado.textContent = "GPS no disponible en este dispositivo/navegador.";
        return;
      }
      resultado.textContent = "Obteniendo ubicación...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          resultado.textContent = `Lat ${gps.lat.toFixed(5)}, Lng ${gps.lng.toFixed(5)}`;
        },
        (err) => {
          resultado.textContent = "No se pudo obtener ubicación: " + err.message;
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    container.querySelector("#formCarga").addEventListener("submit", async (e) => {
      e.preventDefault();
      const origenId = origenIdSel.value;
      if (!origenId) {
        alert("Elegí el origen (lote o silo bolsa).");
        return;
      }
      const neto = calcularNeto(container);

      let origenNombre = "";
      if (origenTipoSel.value === "silo") {
        const silos = await getSilosBolsaConStock();
        const silo = silos.find((s) => s.id === origenId);
        origenNombre = silo ? silo.nombre : "";
        if (silo && neto > silo.kgResidual) {
          const continuar = confirm(
            `El silo bolsa "${silo.nombre}" tiene ${silo.kgResidual} kg residuales y estás cargando ${neto} kg.\n¿Confirmás igual? (puede deberse a una merma no registrada)`
          );
          if (!continuar) return;
        }
      } else {
        const lote = await dbGet("lotes", origenId);
        origenNombre = lote ? lote.nombre : "";
      }

      const corredorId = container.querySelector("#fCorredorId").value;
      const corredor = await dbGet("corredores", corredorId);

      let fotoBlob = null;
      const fotoInput = container.querySelector("#fFoto");
      if (fotoInput.files && fotoInput.files[0]) {
        fotoBlob = fotoInput.files[0];
      }

      const registro = {
        id: uid(),
        fecha: container.querySelector("#fFecha").value,
        origenTipo: origenTipoSel.value,
        origenId,
        origenNombre,
        cultivo: container.querySelector("#fCultivo").value.trim(),
        ctg: container.querySelector("#fCtg").value.trim(),
        chofer: container.querySelector("#fChofer").value.trim(),
        patente: container.querySelector("#fPatente").value.trim(),
        corredorId,
        corredorNombre: corredor ? corredor.nombre : "",
        kgBrutos: parseFloat(container.querySelector("#fBruto").value) || 0,
        tara: parseFloat(container.querySelector("#fTara").value) || 0,
        kgNeto: neto,
        humedad: parseFloat(container.querySelector("#fHumedad").value) || null,
        observaciones: container.querySelector("#fObs").value.trim(),
        gps,
        foto: fotoBlob,
        sincronizado: false,
        fechaCreacionRegistro: new Date().toISOString(),
      };

      await dbPut(STORE, registro);

      this.render(container);
    });

    await renderListadoCargas(container);
  },
};

async function renderListadoCargas(container) {
  const lista = container.querySelector("#listaCargas");
  const cargas = (await dbGetAll(STORE)).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  if (cargas.length === 0) {
    lista.innerHTML = '<div class="empty-state">Todavía no registraste cargas.</div>';
    return;
  }
  lista.innerHTML = `<h2 style="margin-top:0;">Últimas cargas</h2>`;
  for (const c of cargas) {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <div><strong>${c.origenNombre}</strong> (${c.origenTipo === "silo" ? "Silo Bolsa" : "Lote"}) → ${c.corredorNombre}</div>
        <div class="muted">${c.fecha?.replace("T", " ")} · ${c.cultivo} · ${c.kgNeto} kg netos</div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <span class="pill ${c.sincronizado ? "sincronizado" : "pendiente"}">${c.sincronizado ? "Sincronizado" : "Pendiente"}</span>
        <button class="danger" data-id="${c.id}">Borrar</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      if (confirm("¿Borrar este registro?")) {
        await dbDelete(STORE, c.id);
        renderListadoCargas(container);
      }
    });
    lista.appendChild(row);
  }
}

export { cargaGranosView };
