const API_PAGOS     = "/api/Pago";
const API_PRESTAMOS = "/api/Prestamo";

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
    
    prestamosActivos = prestamos.filter(p => ["aprobado", "desembolsado"].includes(p.estado));
    
    const sel = document.getElementById("prestamoId");
    prestamosActivos.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id_prestamo;
      opt.textContent = `Préstamo #${p.id_prestamo} — (Monto Original: ${formatMonto(p.monto)})`;
      sel.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando préstamos:", err); }
}

// ─── CARGAR CUOTAS PENDIENTES ─────────────────────────────────────────────────

async function cargarCuotasPendientes() {
  const prestamoId = document.getElementById("prestamoId").value;
  const selCuota = document.getElementById("cuotaId");
  
  selCuota.innerHTML = '<option value="">-- Seleccione cuota --</option>';
  document.getElementById("info-pago").style.display = "none";
  
  if (!prestamoId) return;

  try {
    const res = await fetch(`${API_PRESTAMOS}/${prestamoId}/amortizacion`);
    const amort = await res.json();
    
    cuotasPendientes = amort.filter(c => c.estado !== "pagada");
    
    if (cuotasPendientes.length === 0) {
      selCuota.innerHTML = '<option value="">Sin cuotas pendientes</option>';
      return;
    }

    cuotasPendientes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id_cuota;
      opt.textContent = `Cuota #${c.numero_cuota} — Vence: ${formatearFecha(c.fecha_vencimiento)} (${formatMonto(c.monto_total)})`;
      selCuota.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando cuotas:", err); }
}

// ─── SELECCIONAR CUOTA Y CONTROLAR MORA ───────────────────────────────────────

function seleccionarCuota() {
  const cuotaId = document.getElementById("cuotaId").value;
  const cuota = cuotasPendientes.find(c => c.id_cuota == cuotaId);
  
  if (!cuota) {
    document.getElementById("info-pago").style.display = "none";
    return;
  }

  document.getElementById("monto").value = Number(cuota.monto_total).toFixed(2);
  recalcularMora();
  document.getElementById("info-pago").style.display = "block";
}

function recalcularMora() {
  const cuotaId = document.getElementById("cuotaId").value;
  const cuota = cuotasPendientes.find(c => c.id_cuota == cuotaId);
  if (!cuota) return;

  const fechaPago = new Date(document.getElementById("fechaPago").value);
  const fechaVenc = new Date(cuota.fecha_vencimiento);
  
  fechaPago.setHours(0,0,0,0);
  fechaVenc.setHours(0,0,0,0);

  let mora = 0;
  let diasRetraso = 0;

  if (fechaPago > fechaVenc) {
    const diffTime = Math.abs(fechaPago - fechaVenc);
    diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Mora base: 0.1% diario del monto total de la cuota
    mora = Number(cuota.monto_total) * 0.001 * diasRetraso;
  }

  const moraTotal = mora + Number(cuota.mora_acumulada || 0);

  document.getElementById("mora").value = moraTotal.toFixed(2);
  document.getElementById("info-vencimiento").textContent = formatearFecha(cuota.fecha_vencimiento);
  document.getElementById("info-retraso").textContent = `${diasRetraso} día(s)`;
  
  actualizarTotalPago();
}

function actualizarTotalPago() {
  const monto = Number(document.getElementById("monto").value) || 0;
  const mora  = Number(document.getElementById("mora").value) || 0;
  const total = monto + mora;
  
  document.getElementById("info-total").textContent = formatMonto(total);
}

// ─── GUARDAR PAGO ─────────────────────────────────────────────────────────────

async function guardarPago(e) {
  e.preventDefault();
  const prestamoId = document.getElementById("prestamoId").value;
  const cuotaId = document.getElementById("cuotaId").value;
  
  const monto = Number(document.getElementById("monto").value) || 0;
  const mora  = Number(document.getElementById("mora").value) || 0;
  const totalPago = monto + mora;

  const metodoSeleccionado = document.getElementById("metodo") ? document.getElementById("metodo").value : 'efectivo';
  const usuarioId = localStorage.getItem("user_id") ? Number(localStorage.getItem("user_id")) : 1;

  const datos = {
    idPrestamo: Number(prestamoId),
    idCuota:    Number(cuotaId),
    montoPagado: String(totalPago), 
    fechaPago:  document.getElementById("fechaPago").value,
    metodo:     metodoSeleccionado, 
    registradoPor: usuarioId
  };

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;

  try {
    const res = await fetch(API_PAGOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    
    const resultado = await res.json();

    if (!res.ok) {
      throw new Error(resultado.error || "Error al registrar el pago en la BD");
    }

    mostrarMensaje("Pago registrado. La cuota ha sido saldada.", "exito");
    limpiarFormulario();
    cargarHistorialPagos();
    cargarCuotasPendientes();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  } finally { 
    btn.disabled = false; 
  }
}

// ─── CARGAR HISTORIAL Y RENDERIZAR TABLA CON 8 COLUMNAS ───────────────────────

async function cargarHistorialPagos() {
  try {
    const res = await fetch(API_PAGOS);
    pagosList = await res.json();
    actualizarResumen(pagosList);
    renderTabla(pagosList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) {
    document.getElementById("tbody-pagos").innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
  }
}

function actualizarResumen(lista) {
  const totalPagado = lista.reduce((s, p) => s + Number(p.monto_pagado), 0);
  document.getElementById("res-pagado").textContent = formatMonto(totalPagado);
  if(document.getElementById("res-count")) document.getElementById("res-count").textContent = lista.length;
}

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-pagos");
  if(document.getElementById("total-pagos")) document.getElementById("total-pagos").textContent = `Total: ${lista.length} registro(s)`;
  
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="cargando">No hay pagos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(p => {
    return `
    <tr>
      <!-- 1. ID -->
      <td>${p.id_pago}</td>
      
      <!-- 2. Préstamo / Socio -->
      <td><strong>Préstamo #${p.id_prestamo}</strong></td>
      
      <!-- 3. Detalle Cuota -->
      <td>Cuota #${p.id_cuota}</td>
      
      <!-- 4. Mora -->
      <td class="monto-rojo">—</td>
      
      <!-- 5. Total Pagado -->
      <td class="total-pagado-celda monto-verde">${formatMonto(p.monto_pagado)}</td>
      
      <!-- 6. Fecha Pago -->
      <td>${formatearFecha(p.fecha_pago)}</td>
      
      <!-- 7. Método -->
      <td><span class="badge badge-pagado" style="text-transform: capitalize;">${p.metodo || 'Efectivo'}</span></td>
      
      <!-- 8. Acciones -->
      <td>
        <div class="acciones">
          <button class="btn btn-historial" onclick="verHistorialPrestamo(${p.id_prestamo}, 'Socio de Préstamo #${p.id_prestamo}')">
            &#128203; Ver Historial
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ─── MODAL DE HISTORIAL POR PRÉSTAMO ──────────────────────────────────────────

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
        <td>${formatearFecha(h.fecha_pago)}</td>
        <td>${formatMonto(h.monto_pagado)}</td>
        <td class="monto-rojo">—</td>
        <td class="monto monto-verde">${formatMonto(h.monto_pagado)}</td>
        <td><span class="badge badge-pagado" style="text-transform: capitalize;">${h.metodo || 'Efectivo'}</span></td>
      </tr>
    `).join("");
  } catch (err) { tbody.innerHTML = '<tr><td colspan="5">Error.</td></tr>'; }
}

function cerrarModalHistorial() {
  document.getElementById("modal-historial").style.display = "none";
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

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
  const fechaLimpia = f.split('T')[0];
  const [a, m, d] = fechaLimpia.split("-");
  return `${d}/${m}/${a}`;
}

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 4000);
}