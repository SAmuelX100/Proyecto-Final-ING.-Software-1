const API_BASE   = "/api/prestamos";
const API_SOCIOS = "/api/socios";

let prestamosList  = [];
let idParaEliminar = null;
let evalPrestamoId = null;
let evalSocioNombre= null;

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaSolicitud").value = hoy;
  cargarSociosSelect();
  cargarPrestamos();
});

// ─── SOCIOS SELECT ────────────────────────────────────────────────────────────

async function cargarSociosSelect() {
  try {
    const res = await fetch(API_SOCIOS);
    const socios = await res.json();
    const sel = document.getElementById("socioId");
    socios.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.nombre} ${s.apellido} — ${s.dni}`;
      sel.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando socios:", err); }
}

// ─── CALCULADORA DE CUOTA ─────────────────────────────────────────────────────

function calcularCuota() {
  const monto = Number(document.getElementById("monto").value);
  const tasa  = Number(document.getElementById("tasaInteres").value);
  const plazo = Number(document.getElementById("plazo").value);
  const box   = document.getElementById("calc-cuota");

  if (!monto || !plazo || plazo < 1) { box.style.display = "none"; return; }
  box.style.display = "block";

  const tasaMensual = tasa / 100 / 12;
  let cuotaFija;
  if (tasaMensual === 0) {
    cuotaFija = monto / plazo;
  } else {
    cuotaFija = (monto * tasaMensual * Math.pow(1 + tasaMensual, plazo)) /
                (Math.pow(1 + tasaMensual, plazo) - 1);
  }
  const totalPagar   = cuotaFija * plazo;
  const totalInteres = totalPagar - monto;

  document.getElementById("calc-cuota-val").textContent     = formatMonto(cuotaFija);
  document.getElementById("calc-total-val").textContent     = formatMonto(totalPagar);
  document.getElementById("calc-intereses-val").textContent = formatMonto(totalInteres);
}

// ─── CARGAR PRÉSTAMOS ─────────────────────────────────────────────────────────

async function cargarPrestamos() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Error al cargar");
    prestamosList = await res.json();
    actualizarResumen(prestamosList);
    renderTabla(prestamosList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) {
    mostrarMensaje("Error al conectar con el servidor: " + err.message, "error");
    document.getElementById("tbody-prestamos").innerHTML =
      '<tr><td colspan="8" class="cargando">No se pudieron cargar los datos.</td></tr>';
  }
}

// ─── RESUMEN ──────────────────────────────────────────────────────────────────

function actualizarResumen(lista) {
  const montoTotal  = lista.reduce((s, p) => s + Number(p.monto), 0);
  const aprobados   = lista.filter(p => ["aprobado","desembolsado"].includes(p.estado)).length;
  const solicitados = lista.filter(p => ["solicitado","en_revision"].includes(p.estado)).length;
  document.getElementById("res-monto").textContent       = formatMonto(montoTotal);
  document.getElementById("res-aprobados").textContent   = aprobados;
  document.getElementById("res-solicitados").textContent = solicitados;
  document.getElementById("res-count").textContent       = lista.length;
}

// ─── RENDERIZAR TABLA ─────────────────────────────────────────────────────────

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-prestamos");
  document.getElementById("total-prestamos").textContent = `Total: ${lista.length} registro(s)`;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="cargando">No hay préstamos registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => {
    const aprobable = ["solicitado", "en_revision"].includes(p.estado);
    return `
    <tr>
      <td>${p.id}</td>
      <td>${escHtml(p.socioNombre || `Socio #${p.socioId}`)}</td>
      <td><span class="monto">${formatMonto(Number(p.monto))}</span></td>
      <td>${Number(p.tasaInteres).toFixed(2)}%</td>
      <td>${p.plazo} meses</td>
      <td>${formatearFecha(p.fechaSolicitud)}</td>
      <td><span class="badge badge-${p.estado}">${estadoLabel(p.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-evaluar" onclick="abrirModalEval(${p.id},'${escAttr(p.socioNombre || '')}')" ${!aprobable ? "disabled" : ""}>
            &#128202; Evaluar
          </button>
          <button class="btn btn-amortizacion" onclick="verAmortizacion(${p.id},'${escAttr(p.socioNombre || '')}',${Number(p.monto)},${Number(p.tasaInteres)},${p.plazo})">
            &#128197; Cuotas
          </button>
          <button class="btn btn-editar" onclick="editarPrestamo(${p.id})">&#9998; Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${p.id},'${escAttr(p.socioNombre || '')}')">&#128465; Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ─── FILTRAR ──────────────────────────────────────────────────────────────────

function filtrarTabla() {
  const q      = document.getElementById("buscar").value.toLowerCase();
  const estado = document.getElementById("filtro-estado").value;
  const filtrados = prestamosList
    .filter(p => (p.socioNombre || "").toLowerCase().includes(q))
    .filter(p => !estado || p.estado === estado);
  renderTabla(filtrados);
}

// ─── GUARDAR PRÉSTAMO ─────────────────────────────────────────────────────────

async function guardarPrestamo(e) {
  e.preventDefault();
  const id = document.getElementById("prestamo-id").value;
  const datos = {
    socioId:        Number(document.getElementById("socioId").value),
    monto:          String(Number(document.getElementById("monto").value)),
    tasaInteres:    String(Number(document.getElementById("tasaInteres").value)),
    plazo:          Number(document.getElementById("plazo").value),
    fechaSolicitud: document.getElementById("fechaSolicitud").value,
    estado:         document.getElementById("estado").value,
  };
  if (!datos.socioId || !datos.monto || !datos.plazo || !datos.fechaSolicitud) {
    mostrarMensaje("Socio, Monto, Plazo y Fecha son obligatorios.", "error"); return;
  }
  if (Number(datos.monto) <= 0) { mostrarMensaje("El monto debe ser mayor a cero.", "error"); return; }
  if (datos.plazo < 1) { mostrarMensaje("El plazo debe ser al menos 1 mes.", "error"); return; }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  try {
    const res = await fetch(id ? `${API_BASE}/${id}` : API_BASE, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al guardar.", "error"); return; }
    mostrarMensaje(id ? "Préstamo actualizado exitosamente." : `Préstamo registrado (ID: ${resultado.id}).`, "exito");
    limpiarFormulario();
    await cargarPrestamos();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally { btn.disabled = false; }
}

// ─── EDITAR ───────────────────────────────────────────────────────────────────

async function editarPrestamo(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error("No encontrado");
    const p = await res.json();
    document.getElementById("prestamo-id").value       = p.id;
    document.getElementById("socioId").value           = p.socioId;
    document.getElementById("monto").value             = Number(p.monto).toFixed(2);
    document.getElementById("tasaInteres").value       = Number(p.tasaInteres).toFixed(2);
    document.getElementById("plazo").value             = p.plazo;
    document.getElementById("fechaSolicitud").value    = p.fechaSolicitud || "";
    document.getElementById("estado").value            = p.estado;
    document.getElementById("form-titulo").textContent = `Editar Préstamo #${p.id}`;
    document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
    document.getElementById("btn-cancelar").style.display = "inline-block";
    calcularCuota();
    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  } catch (err) { mostrarMensaje("No se pudo cargar: " + err.message, "error"); }
}

// ─── MODAL EVALUACIÓN ─────────────────────────────────────────────────────────

async function abrirModalEval(id, socioNombre) {
  evalPrestamoId  = id;
  evalSocioNombre = socioNombre;
  document.getElementById("eval-id").textContent    = id;
  document.getElementById("eval-socio").textContent = socioNombre;
  document.getElementById("eval-contenido").innerHTML = '<p class="cargando">Calculando evaluación...</p>';
  document.getElementById("eval-decision").style.display = "none";
  document.getElementById("modal-evaluacion").style.display = "flex";

  try {
    const res = await fetch(`${API_BASE}/${id}/evaluar`);
    const ev  = await res.json();
    if (!res.ok) { document.getElementById("eval-contenido").innerHTML = `<p>${ev.error}</p>`; return; }

    const colorRec = ev.recomendacion === "APROBAR" ? "eval-aprobado"
                   : ev.recomendacion === "REVISAR" ? "eval-revisar" : "eval-rechazar";
    document.getElementById("eval-contenido").innerHTML = `
      <div class="eval-item"><span class="eval-label">Monto solicitado</span><span class="eval-valor">${formatMonto(ev.monto)}</span></div>
      <div class="eval-item"><span class="eval-label">Tasa de interés</span><span class="eval-valor">${Number(ev.tasa).toFixed(2)}% anual</span></div>
      <div class="eval-item"><span class="eval-label">Plazo</span><span class="eval-valor">${ev.plazo} meses</span></div>
      <div class="eval-item"><span class="eval-label">Cuota mensual</span><span class="eval-valor">${formatMonto(ev.cuotaMensual)}</span></div>
      <div class="eval-item"><span class="eval-label">Puntaje crediticio</span><span class="eval-valor">${ev.puntos} / 100</span></div>
      <div class="eval-item"><span class="eval-label">Recomendación</span><span class="eval-valor ${colorRec}">${ev.recomendacion}</span></div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;">
      ${ev.observaciones.map(o => `<div style="font-size:0.82rem;color:#718096;padding:3px 0;">• ${escHtml(o)}</div>`).join("")}
    `;
    document.getElementById("eval-decision").style.display = "flex";
  } catch (err) {
    document.getElementById("eval-contenido").innerHTML = '<p>Error al evaluar.</p>';
  }
}

function cerrarModalEval() {
  evalPrestamoId = null;
  document.getElementById("modal-evaluacion").style.display = "none";
}

async function tomarDecision(decision) {
  if (!evalPrestamoId) return;
  try {
    const res = await fetch(`${API_BASE}/${evalPrestamoId}/decision`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error.", "error"); return; }
    cerrarModalEval();
    mostrarMensaje(
      `Préstamo ${decision === "aprobado" ? "aprobado" : "rechazado"} exitosamente.` +
      (decision === "aprobado" ? " Se generó la tabla de amortización." : ""), "exito"
    );
    await cargarPrestamos();
  } catch (err) { mostrarMensaje("Error de conexión.", "error"); }
}

// ─── MODAL AMORTIZACIÓN ───────────────────────────────────────────────────────

async function verAmortizacion(id, socioNombre, monto, tasa, plazo) {
  document.getElementById("amort-id").textContent    = id;
  document.getElementById("amort-socio").textContent = socioNombre;
  document.getElementById("amort-resumen").textContent =
    `${formatMonto(monto)} · ${Number(tasa).toFixed(2)}% anual · ${plazo} meses`;
  document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">Cargando...</td></tr>';
  document.getElementById("amort-total").textContent = "";
  document.getElementById("modal-amortizacion").style.display = "flex";

  try {
    const res    = await fetch(`${API_BASE}/${id}/amortizacion`);
    const cuotas = await res.json();
    if (!cuotas.length) {
      document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">Sin cuotas generadas.</td></tr>';
      return;
    }
    let totalCuota = 0, totalCapital = 0, totalInteres = 0;
    document.getElementById("tbody-amort").innerHTML = cuotas.map(c => {
      const mc = Number(c.montoCuota), cap = Number(c.capital), int = Number(c.interes);
      totalCuota += mc; totalCapital += cap; totalInteres += int;
      return `
      <tr class="${c.estado === "pagada" ? "cuota-pagada" : ""}">
        <td>${c.numeroCuota}</td>
        <td>${formatMonto(mc)}</td>
        <td class="monto-verde">+${formatMonto(cap)}</td>
        <td class="monto-rojo">+${formatMonto(int)}</td>
        <td><span class="monto">${formatMonto(Number(c.saldo))}</span></td>
        <td>${formatearFecha(c.fechaVencimiento)}</td>
        <td><span class="badge badge-${c.estado || "pendiente"}">${
          c.estado === "pagada" ? "Pagada" : c.estado === "vencida" ? "Vencida" : "Pendiente"
        }</span></td>
      </tr>`;
    }).join("");
    document.getElementById("amort-total").innerHTML =
      `Total cuotas: <strong>${formatMonto(totalCuota)}</strong> &nbsp;|&nbsp; ` +
      `Capital: <span class="monto-verde">${formatMonto(totalCapital)}</span> &nbsp;|&nbsp; ` +
      `Intereses: <span class="monto-rojo">${formatMonto(totalInteres)}</span>`;
  } catch (err) {
    document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">Error al cargar.</td></tr>';
  }
}

function cerrarModalAmort() {
  document.getElementById("modal-amortizacion").style.display = "none";
}

// ─── CANCELAR EDICIÓN ─────────────────────────────────────────────────────────

function cancelarEdicion() { limpiarFormulario(); ocultarMensaje(); }

// ─── ELIMINAR ─────────────────────────────────────────────────────────────────

function pedirEliminar(id, nombre) {
  idParaEliminar = id;
  document.getElementById("modal-nombre").textContent = nombre;
  document.getElementById("modal-eliminar").style.display = "flex";
}

function cerrarModal() {
  idParaEliminar = null;
  document.getElementById("modal-eliminar").style.display = "none";
}

async function confirmarEliminar() {
  if (!idParaEliminar) return;
  cerrarModal();
  try {
    const res = await fetch(`${API_BASE}/${idParaEliminar}`, { method: "DELETE" });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al eliminar.", "error"); return; }
    mostrarMensaje("Préstamo eliminado exitosamente.", "exito");
    await cargarPrestamos();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
}

// ─── LIMPIAR FORMULARIO ───────────────────────────────────────────────────────

function limpiarFormulario() {
  document.getElementById("form-prestamo").reset();
  document.getElementById("prestamo-id").value = "";
  document.getElementById("form-titulo").textContent = "Solicitar Nuevo Préstamo";
  document.getElementById("btn-guardar").textContent = "✓ Solicitar Préstamo";
  document.getElementById("btn-cancelar").style.display = "none";
  document.getElementById("calc-cuota").style.display = "none";
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaSolicitud").value = hoy;
  document.getElementById("estado").value = "solicitado";
}

// ─── MENSAJES ─────────────────────────────────────────────────────────────────

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(ocultarMensaje, 5000);
}
function ocultarMensaje() { document.getElementById("mensaje").style.display = "none"; }

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function formatMonto(v) {
  return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatearFecha(f) {
  if (!f) return '<span style="color:#a0aec0">—</span>';
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}
function estadoLabel(e) {
  return {
    solicitado:"Solicitado", en_revision:"En Revisión", aprobado:"Aprobado",
    rechazado:"Rechazado", desembolsado:"Desembolsado", pagado:"Pagado"
  }[e] || e;
}
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;"); }