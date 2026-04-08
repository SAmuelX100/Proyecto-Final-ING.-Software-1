const API_PAGOS     = "/api/pagos";
const API_PRESTAMOS = "/api/prestamos";

let pagosList = [];
let prestamosActivos = [];
let cuotasPendientes = [];

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaPago").value = hoy;
  cargarPrestamosSelect();
  cargarHistorialPagos();
});

// ─── CARGAR PRÉSTAMOS ACTIVOS ─────────────────────────────────────────────────

async function cargarPrestamosSelect() {
  try {
    const res = await fetch(API_PRESTAMOS);
    const prestamos = await res.json();
    // Solo préstamos que puedan recibir pagos
    prestamosActivos = prestamos.filter(p => ["aprobado", "desembolsado"].includes(p.estado));
    
    const sel = document.getElementById("prestamoId");
    prestamosActivos.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `ID: ${p.id} — ${p.socioNombre} (${formatMonto(p.monto)})`;
      sel.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando préstamos:", err); }
}

// ─── CARGAR CUOTAS PENDIENTES (calcularCuotas) ───────────────────────────────

async function cargarCuotasPendientes() {
  const prestamoId = document.getElementById("prestamoId").value;
  const selCuota = document.getElementById("cuotaId");
  
  selCuota.innerHTML = '<option value="">-- Seleccione cuota --</option>';
  document.getElementById("info-pago").style.display = "none";
  
  if (!prestamoId) return;

  try {
    // Simulamos o llamamos a la función del diagrama: calcularCuotas(prestamoId)
    const res = await fetch(`${API_PRESTAMOS}/${prestamoId}/amortizacion`);
    const amort = await res.json();
    
    cuotasPendientes = amort.filter(c => c.estado !== "pagada");
    
    if (cuotasPendientes.length === 0) {
      selCuota.innerHTML = '<option value="">Sin cuotas pendientes</option>';
      return;
    }

    cuotasPendientes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `Cuota #${c.numeroCuota} — Vence: ${formatearFecha(c.fechaVencimiento)} (${formatMonto(c.montoCuota)})`;
      selCuota.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando cuotas:", err); }
}

// ─── SELECCIONAR CUOTA Y CONTROLAR MORA ───────────────────────────────────────

function seleccionarCuota() {
  const cuotaId = document.getElementById("cuotaId").value;
  const cuota = cuotasPendientes.find(c => c.id == cuotaId);
  
  if (!cuota) {
    document.getElementById("info-pago").style.display = "none";
    return;
  }

  document.getElementById("monto").value = Number(cuota.montoCuota).toFixed(2);
  recalcularMora();
  document.getElementById("info-pago").style.display = "block";
}

// ─── CONTROLAR MORA (Lógica de negocio) ───────────────────────────────────────

function recalcularMora() {
  const cuotaId = document.getElementById("cuotaId").value;
  const cuota = cuotasPendientes.find(c => c.id == cuotaId);
  if (!cuota) return;

  const fechaPago = new Date(document.getElementById("fechaPago").value);
  const fechaVenc = new Date(cuota.fechaVencimiento);
  
  // Resetear horas para comparar solo días
  fechaPago.setHours(0,0,0,0);
  fechaVenc.setHours(0,0,0,0);

  let mora = 0;
  let diasRetraso = 0;

  if (fechaPago > fechaVenc) {
    const diffTime = Math.abs(fechaPago - fechaVenc);
    diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Ejemplo de lógica de mora: 1% del monto de la cuota por cada 5 días de retraso
    // O una tasa fija diaria. Aquí usaremos un 0.1% diario.
    mora = Number(cuota.montoCuota) * 0.001 * diasRetraso;
  }

  document.getElementById("mora").value = mora.toFixed(2);
  document.getElementById("info-vencimiento").textContent = formatearFecha(cuota.fechaVencimiento);
  document.getElementById("info-retraso").textContent = `${diasRetraso} día(s)`;
  
  actualizarTotalPago();
}

function actualizarTotalPago() {
  const monto = Number(document.getElementById("monto").value) || 0;
  const mora  = Number(document.getElementById("mora").value) || 0;
  const total = monto + mora;
  
  document.getElementById("info-total").textContent = formatMonto(total);
}

// ─── GUARDAR PAGO (registrarPago) ─────────────────────────────────────────────

async function guardarPago(e) {
  e.preventDefault();
  const prestamoId = document.getElementById("prestamoId").value;
  const datos = {
    prestamoId: Number(prestamoId),
    cuotaId:    Number(document.getElementById("cuotaId").value),
    monto:      document.getElementById("monto").value,
    mora:       document.getElementById("mora").value,
    fechaPago:  document.getElementById("fechaPago").value,
    estado:     document.getElementById("estado").value
  };

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;

  try {
    const res = await fetch(API_PAGOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    
    if (!res.ok) throw new Error("Error al registrar el pago");

    mostrarMensaje("Pago registrado correctamente.", "exito");
    limpiarFormulario();
    cargarHistorialPagos();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  } finally { btn.disabled = false; }
}

// ─── CARGAR HISTORIAL (historialPagos) ────────────────────────────────────────

async function cargarHistorialPagos() {
  try {
    const res = await fetch(API_PAGOS);
    pagosList = await res.json();
    actualizarResumen(pagosList);
    renderTabla(pagosList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) {
    console.error("Error:", err);
    document.getElementById("tbody-pagos").innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
  }
}

function actualizarResumen(lista) {
  const totalPagado = lista.reduce((s, p) => s + Number(p.monto) + Number(p.mora), 0);
  const totalMora   = lista.reduce((s, p) => s + Number(p.mora), 0);
  // Nota: Las cuotas vencidas vendrían de otra API de control, aquí ponemos un ejemplo
  document.getElementById("res-pagado").textContent = formatMonto(totalPagado);
  document.getElementById("res-mora").textContent   = formatMonto(totalMora);
  document.getElementById("res-count").textContent  = lista.length;
}

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-pagos");
  document.getElementById("total-pagos").textContent = `Total: ${lista.length} registro(s)`;
  
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="cargando">No hay pagos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const total = Number(p.monto) + Number(p.mora);
    return `
    <tr>
      <td>${p.id}</td>
      <td><strong>#${p.prestamoId}</strong> — ${escHtml(p.socioNombre || 'Socio')}</td>
      <td>${formatMonto(p.monto)}</td>
      <td class="mora-valor">${p.mora > 0 ? '+' + formatMonto(p.mora) : '—'}</td>
      <td class="total-pagado-celda">${formatMonto(total)}</td>
      <td>${formatearFecha(p.fechaPago)}</td>
      <td><span class="badge badge-${p.estado}">${p.estado.toUpperCase()}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-amortizacion" onclick="verHistorialPrestamo(${p.prestamoId}, '${escAttr(p.socioNombre)}')">
            Ver Todo
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ─── HISTORIAL ESPECÍFICO (historialPagos por Préstamo) ───────────────────────

async function verHistorialPrestamo(prestamoId, socioNombre) {
  document.getElementById("hist-id").textContent = prestamoId;
  document.getElementById("hist-socio").textContent = socioNombre;
  const tbody = document.getElementById("tbody-historial-especifico");
  tbody.innerHTML = '<tr><td colspan="5" class="cargando">Cargando...</td></tr>';
  document.getElementById("modal-historial").style.display = "flex";

  try {
    const res = await fetch(`${API_PAGOS}?prestamoId=${prestamoId}`);
    const historial = await res.json();
    
    tbody.innerHTML = historial.map(h => `
      <tr>
        <td>${formatearFecha(h.fechaPago)}</td>
        <td>${formatMonto(h.monto)}</td>
        <td class="monto-rojo">${formatMonto(h.mora)}</td>
        <td class="monto">${formatMonto(Number(h.monto) + Number(h.mora))}</td>
        <td><span class="badge badge-${h.estado}">${h.estado}</span></td>
      </tr>
    `).join("");
  } catch (err) { tbody.innerHTML = '<tr><td colspan="5">Error.</td></tr>'; }
}

function cerrarModalHistorial() {
  document.getElementById("modal-historial").style.display = "none";
}

// ─── UTILIDADES REUTILIZADAS ──────────────────────────────────────────────────

function limpiarFormulario() {
  document.getElementById("form-pago").reset();
  document.getElementById("info-pago").style.display = "none";
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaPago").value = hoy;
}

function formatMonto(v) {
  return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2 });
}

function formatearFecha(f) {
  if (!f) return "—";
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function escAttr(s) {
  return String(s).replace(/'/g,"\\'");
}

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 4000);
}