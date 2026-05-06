const API_BASE   = "/api/Prestamo"; 
const API_SOCIOS = "/api/Socio";    

let prestamosList  = [];
let sociosDict     = {}; 
let idParaEliminar = null;
let evalPrestamoId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaSolicitud").value = hoy;
  await cargarSociosSelect(); 
  await cargarPrestamos();
});

async function cargarSociosSelect() {
  try {
    const res = await fetch(API_SOCIOS);
    const socios = await res.json();
    const sel = document.getElementById("socioId");
    socios.forEach(s => {
      sociosDict[s.id_socio] = `${s.nombre} ${s.apellido}`; 
      const opt = document.createElement("option");
      opt.value = s.id_socio; 
      opt.textContent = `${s.nombre} ${s.apellido} — ${s.dni}`;
      sel.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando socios:", err); }
}

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

async function cargarPrestamos() {
  try {
    const res = await fetch(API_BASE);
    prestamosList = await res.json();
    actualizarResumen(prestamosList);
    renderTabla(prestamosList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) { mostrarMensaje("Error al cargar datos", "error"); }
}

function actualizarResumen(lista) {
  const montoTotal  = lista.reduce((s, p) => s + Number(p.monto), 0);
  const aprobados   = lista.filter(p => ["aprobado","desembolsado"].includes(p.estado)).length;
  const solicitados = lista.filter(p => ["solicitado","en_revision"].includes(p.estado)).length;
  document.getElementById("res-monto").textContent       = formatMonto(montoTotal);
  document.getElementById("res-aprobados").textContent   = aprobados;
  document.getElementById("res-solicitados").textContent = solicitados;
  document.getElementById("res-count").textContent       = lista.length;
}

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-prestamos");
  document.getElementById("total-prestamos").textContent = `Total: ${lista.length} registro(s)`;
  tbody.innerHTML = lista.map(p => {
    const aprobable = ["solicitado", "en_revision"].includes(p.estado);
    const nombreSocio = sociosDict[p.id_socio] || `Socio #${p.id_socio}`;
    return `
    <tr>
      <td>${p.id_prestamo}</td>
      <td>${escHtml(nombreSocio)}</td>
      <td>${formatMonto(p.monto)}</td>
      <td>${Number(p.tasa_interes).toFixed(2)}%</td>
      <td>${p.plazo_meses} meses</td>
      <td>${formatearFecha(p.fecha_solicitud)}</td>
      <td><span class="badge badge-${p.estado}">${estadoLabel(p.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-evaluar" onclick="abrirModalEval(${p.id_prestamo},'${escAttr(nombreSocio)}')" ${!aprobable ? "disabled" : ""}>
            &#128202; Evaluar
          </button>
          <button class="btn btn-amortizacion" onclick="verAmortizacion(${p.id_prestamo},'${escAttr(nombreSocio)}',${Number(p.monto)},${Number(p.tasa_interes)},${p.plazo_meses})">
            &#128197; Cuotas
          </button>
          <button class="btn btn-editar" onclick="editarPrestamo(${p.id_prestamo})">✏ Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${p.id_prestamo}, '${escAttr(nombreSocio)}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function filtrarTabla() {
  const q      = document.getElementById("buscar").value.toLowerCase();
  const estado = document.getElementById("filtro-estado").value;
  const filtrados = prestamosList
    .filter(p => {
        const nombreSocio = sociosDict[p.id_socio] || "";
        return nombreSocio.toLowerCase().includes(q);
    })
    .filter(p => !estado || p.estado === estado);
  renderTabla(filtrados);
}

async function guardarPrestamo(e) {
  e.preventDefault();
  const id = document.getElementById("prestamo-id").value;
  const estadoSeleccionado = document.getElementById("estado").value;
  
  const datos = {
    idSocio: Number(document.getElementById("socioId").value), 
    monto: document.getElementById("monto").value,
    tasaInteres: document.getElementById("tasaInteres").value, 
    plazoMeses: Number(document.getElementById("plazo").value), 
    fechaSolicitud: document.getElementById("fechaSolicitud").value, 
    estado: estadoSeleccionado,
  };

  // Auditoría automática de aprobación
  if (["aprobado", "desembolsado"].includes(estadoSeleccionado)) {
    const pExistente = id ? prestamosList.find(x => x.id_prestamo == id) : null;
    datos.fechaAprobacion = (pExistente && pExistente.fecha_aprobacion) 
      ? pExistente.fecha_aprobacion.split('T')[0] 
      : new Date().toISOString().split("T")[0];
    datos.aprobadoPor = (pExistente && pExistente.aprobado_por) 
      ? pExistente.aprobado_por 
      : Number(localStorage.getItem("user_id"));
  } else {
    datos.fechaAprobacion = null;
    datos.aprobadoPor = null;
  }

  try {
    const res = await fetch(id ? `${API_BASE}/${id}` : API_BASE, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (res.ok) {
      mostrarMensaje("Operación exitosa", "exito");
      limpiarFormulario();
      await cargarPrestamos();
    }
  } catch (err) { mostrarMensaje("Error de conexión", "error"); }
}

function editarPrestamo(id) {
  const p = prestamosList.find(x => x.id_prestamo === id);
  if (!p) return;

  document.getElementById("prestamo-id").value = p.id_prestamo;
  document.getElementById("socioId").value = p.id_socio;
  document.getElementById("monto").value = Number(p.monto).toFixed(2);
  document.getElementById("tasaInteres").value = Number(p.tasa_interes).toFixed(2);
  document.getElementById("plazo").value = p.plazo_meses;
  document.getElementById("fechaSolicitud").value = p.fecha_solicitud?.split('T')[0];
  document.getElementById("estado").value = p.estado;
  
  document.getElementById("form-titulo").textContent = `Editar Préstamo #${p.id_prestamo}`;
  document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
  document.getElementById("btn-cancelar").style.display = "inline-block";
  calcularCuota();
  document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
}

async function abrirModalEval(id, socioNombre) {
  evalPrestamoId  = id;
  document.getElementById("eval-id").textContent    = id;
  document.getElementById("eval-socio").textContent = socioNombre;
  document.getElementById("eval-contenido").innerHTML = '<p class="cargando">Este endpoint no está disponible en la API genérica.</p>';
  document.getElementById("modal-evaluacion").style.display = "flex";
}

function cerrarModalEval() {
  evalPrestamoId = null;
  document.getElementById("modal-evaluacion").style.display = "none";
}

// ─── MODAL AMORTIZACIÓN (CONECTADO A LA TABLA CUOTA) ──────────────────────────

async function verAmortizacion(id, socioNombre, monto, tasa, plazo) {
  document.getElementById("amort-id").textContent    = id;
  document.getElementById("amort-socio").textContent = socioNombre;
  document.getElementById("amort-resumen").textContent =
    `${formatMonto(monto)} · ${Number(tasa).toFixed(2)}% anual · ${plazo} meses`;
  document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">Cargando cuotas...</td></tr>';
  document.getElementById("amort-total").textContent = "";
  document.getElementById("modal-amortizacion").style.display = "flex";

  try {
    const res    = await fetch(`${API_BASE}/${id}/amortizacion`);
    const cuotas = await res.json();
    
    if (!cuotas.length) {
      document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">No hay cuotas generadas para este préstamo.</td></tr>';
      return;
    }

    let totalCuota = 0, totalCapital = 0, totalInteres = 0;
    
    document.getElementById("tbody-amort").innerHTML = cuotas.map(c => {
      // Mapeando las columnas EXACTAS de tu tabla PostgreSQL
      const mc   = Number(c.monto_total);
      const cap  = Number(c.montol_capital); // Nota: Usando el typo de tu DB
      const int  = Number(c.monto_interes);
      const mora = Number(c.mora_acumulada);
      
      totalCuota += mc; totalCapital += cap; totalInteres += int;
      
      return `
      <tr class="${c.estado === "pagada" ? "cuota-pagada" : ""}">
        <td>${c.numero_cuota}</td>
        <td>${formatMonto(mc)}</td>
        <td class="monto-verde">+${formatMonto(cap)}</td>
        <td class="monto-rojo">+${formatMonto(int)}</td>
        <!-- Reemplazamos 'Saldo' por 'Mora' para reflejar tu BD -->
        <td><span class="${mora > 0 ? 'monto-rojo' : ''}">${formatMonto(mora)}</span></td>
        <td>${formatearFecha(c.fecha_vencimiento)}</td>
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
    document.getElementById("tbody-amort").innerHTML = '<tr><td colspan="7" class="cargando">Error al conectar con la base de datos.</td></tr>';
  }
}

function cerrarModalAmort() {
  document.getElementById("modal-amortizacion").style.display = "none";
}

function cancelarEdicion() { limpiarFormulario(); ocultarMensaje(); }

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
  try {
    const res = await fetch(`${API_BASE}/${idParaEliminar}`, { method: "DELETE" });
    if (res.ok) {
      mostrarMensaje("Préstamo eliminado exitosamente.", "exito");
      cerrarModal();
      await cargarPrestamos();
    }
  } catch (err) { mostrarMensaje("Error de conexión", "error"); }
}

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

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(ocultarMensaje, 5000);
}

function ocultarMensaje() { document.getElementById("mensaje").style.display = "none"; }
function formatMonto(v) { return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatearFecha(f) { 
  if (!f) return '<span style="color:#a0aec0">—</span>'; 
  const [a, m, d] = f.split('T')[0].split("-"); 
  return `${d}/${m}/${a}`; 
}
function estadoLabel(e) { return { solicitado:"Solicitado", en_revision:"En Revisión", aprobado:"Aprobado", rechazado:"Rechazado", desembolsado:"Desembolsado", pagado:"Pagado" }[e] || e; }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;"); }