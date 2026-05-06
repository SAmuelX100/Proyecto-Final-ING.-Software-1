const API_BASE   = "/api/Cuenta_ahorro";
const API_SOCIOS = "/api/Socio";

let cuentasList    = [];
let sociosDict     = {}; 
let idParaEliminar = null;
let txCuentaId     = null;
let txTipo         = null;

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaApertura").value = hoy;
  await cargarSociosSelect();
  await cargarCuentas();
});

// ─── SOCIOS SELECT ────────────────────────────────────────────────────────────

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

// ─── CARGAR CUENTAS ───────────────────────────────────────────────────────────

async function cargarCuentas() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Error al cargar");
    cuentasList = await res.json();
    actualizarResumen(cuentasList);
    renderTabla(cuentasList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) {
    mostrarMensaje("Error al conectar con el servidor: " + err.message, "error");
    document.getElementById("tbody-ahorros").innerHTML =
      '<tr><td colspan="7" class="cargando">No se pudieron cargar los datos.</td></tr>';
  }
}

// ─── RESUMEN ──────────────────────────────────────────────────────────────────

function actualizarResumen(lista) {
  const saldoTotal = lista.reduce((s, c) => s + Number(c.saldo), 0);
  const activas    = lista.filter(c => c.estado === "activa").length;
  const cerradas   = lista.filter(c => c.estado === "cerrada").length;
  document.getElementById("res-saldo").textContent    = formatMonto(saldoTotal);
  document.getElementById("res-activas").textContent  = activas;
  document.getElementById("res-cerradas").textContent = cerradas;
  document.getElementById("res-count").textContent    = lista.length;
}

// ─── RENDERIZAR TABLA ─────────────────────────────────────────────────────────

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-ahorros");
  document.getElementById("total-cuentas").textContent = `Total: ${lista.length} cuenta(s)`;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="cargando">No hay cuentas registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const activa = c.estado === "activa";
    const nombreSocio = sociosDict[c.id_socio] || `Socio #${c.id_socio}`;

    return `
    <tr>
      <td>${c.id_cuenta}</td>
      <td>${escHtml(nombreSocio)}</td>
      <td><strong>${escHtml(c.numero_cuenta)}</strong></td>
      <td><span class="monto">${formatMonto(Number(c.saldo))}</span></td>
      <td>${formatearFecha(c.fecha_apertura)}</td>
      <td><span class="badge badge-${c.estado}">${estadoLabel(c.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-depositar" onclick="abrirModalTx(${c.id_cuenta},'deposito','${escAttr(c.numero_cuenta)}',${Number(c.saldo)})" ${!activa ? "disabled" : ""}>
            &#8679; Depositar
          </button>
          <button class="btn btn-retirar" onclick="abrirModalTx(${c.id_cuenta},'retiro','${escAttr(c.numero_cuenta)}',${Number(c.saldo)})" ${!activa ? "disabled" : ""}>
            &#8681; Retirar
          </button>
          <button class="btn btn-historial" onclick="verHistorial(${c.id_cuenta},'${escAttr(c.numero_cuenta)}','${escAttr(nombreSocio)}')">
            &#128203; Movimientos
          </button>
          <button class="btn btn-editar" onclick="editarCuenta(${c.id_cuenta})">&#9998; Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${c.id_cuenta},'${escAttr(c.numero_cuenta)}')">&#128465; Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ─── FILTRAR ──────────────────────────────────────────────────────────────────

function filtrarTabla() {
  const q      = document.getElementById("buscar").value.toLowerCase();
  const estado = document.getElementById("filtro-estado").value;
  const filtrados = cuentasList.filter(c => {
    const nombreSocio = sociosDict[c.id_socio] || "";
    return nombreSocio.toLowerCase().includes(q) || c.numero_cuenta.toLowerCase().includes(q);
  }).filter(c => !estado || c.estado === estado);
  renderTabla(filtrados);
}

// ─── GUARDAR CUENTA ───────────────────────────────────────────────────────────

async function guardarCuenta(e) {
  e.preventDefault();
  const id = document.getElementById("ahorro-id").value;
  const datos = {
    idSocio:       Number(document.getElementById("socioId").value),
    numeroCuenta:  document.getElementById("numeroCuenta").value.trim(),
    saldo:         String(Number(document.getElementById("saldo").value) || 0),
    fechaApertura: document.getElementById("fechaApertura").value,
    estado:        document.getElementById("estado").value,
  };
  if (!datos.idSocio || !datos.numeroCuenta || !datos.fechaApertura) {
    mostrarMensaje("Socio, Número de Cuenta y Fecha son obligatorios.", "error"); return;
  }
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
    mostrarMensaje(id ? "Cuenta actualizada exitosamente." : `Cuenta abierta exitosamente (ID: ${resultado.id_cuenta}).`, "exito");
    limpiarFormulario();
    await cargarCuentas();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally { btn.disabled = false; }
}

// ─── EDITAR ───────────────────────────────────────────────────────────────────

function editarCuenta(id) {
  try {
    const c = cuentasList.find(x => x.id_cuenta === id);
    if (!c) throw new Error("Cuenta no encontrada");

    document.getElementById("ahorro-id").value         = c.id_cuenta;
    document.getElementById("socioId").value           = c.id_socio;
    document.getElementById("numeroCuenta").value      = c.numero_cuenta;
    document.getElementById("saldo").value             = Number(c.saldo).toFixed(2);
    document.getElementById("fechaApertura").value     = c.fecha_apertura?.split('T')[0] || "";
    document.getElementById("estado").value            = c.estado;
    document.getElementById("form-titulo").textContent = `Editar Cuenta — ${c.numero_cuenta}`;
    document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
    document.getElementById("btn-cancelar").style.display = "inline-block";
    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  } catch (err) { mostrarMensaje("No se pudo cargar: " + err.message, "error"); }
}

// ─── MODAL DEPÓSITO / RETIRO ──────────────────────────────────────────────────

function abrirModalTx(cuentaId, tipo, numeroCuenta, saldo) {
  txCuentaId = cuentaId;
  txTipo     = tipo;
  document.getElementById("modal-tx-titulo").textContent = tipo === "deposito" ? "💰 Depósito" : "💸 Retiro";
  document.getElementById("modal-tx-cuenta").textContent = numeroCuenta;
  document.getElementById("modal-tx-saldo").textContent  = formatMonto(saldo);
  document.getElementById("tx-monto").value              = "";
  document.getElementById("tx-descripcion").value        = "";
  document.getElementById("msg-transaccion").style.display = "none";
  document.getElementById("btn-tx-confirmar").style.background = tipo === "deposito" ? "#38a169" : "#dd6b20";
  document.getElementById("modal-transaccion").style.display = "flex";
}

function cerrarModalTx() {
  txCuentaId = null; txTipo = null;
  document.getElementById("modal-transaccion").style.display = "none";
}

async function confirmarTransaccion() {
  const monto       = Number(document.getElementById("tx-monto").value);
  const descripcion = document.getElementById("tx-descripcion").value.trim();
  if (!monto || monto <= 0) {
    document.getElementById("msg-transaccion").textContent = "Ingresa un monto válido.";
    document.getElementById("msg-transaccion").className   = "mensaje error";
    document.getElementById("msg-transaccion").style.display = "block";
    return;
  }
  
  const btnConfirmar = document.getElementById("btn-tx-confirmar");
  btnConfirmar.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/${txCuentaId}/${txTipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, descripcion: descripcion || undefined }),
    });
    const resultado = await res.json();
    
    if (!res.ok) {
      document.getElementById("msg-transaccion").textContent = resultado.error || "Error en la transacción.";
      document.getElementById("msg-transaccion").className   = "mensaje error";
      document.getElementById("msg-transaccion").style.display = "block";
      return;
    }
    cerrarModalTx();
    mostrarMensaje(`${txTipo === "deposito" ? "Depósito" : "Retiro"} realizado. Nuevo saldo: ${formatMonto(resultado.saldo)}.`, "exito");
    await cargarCuentas();
  } catch (err) {
    document.getElementById("msg-transaccion").textContent = "Error de conexión.";
    document.getElementById("msg-transaccion").className   = "mensaje error";
    document.getElementById("msg-transaccion").style.display = "block";
  } finally {
    btnConfirmar.disabled = false;
  }
}

// ─── MODAL HISTORIAL DE MOVIMIENTOS ───────────────────────────────────────────

async function verHistorial(id, numeroCuenta, socioNombre) {
  document.getElementById("hist-cuenta").textContent = numeroCuenta;
  document.getElementById("hist-socio").textContent  = socioNombre;
  document.getElementById("hist-total").textContent  = "";
  document.getElementById("tbody-historial").innerHTML = '<tr><td colspan="5" class="cargando">Cargando movimientos...</td></tr>';
  document.getElementById("modal-historial").style.display = "flex";
  try {
    const res   = await fetch(`${API_BASE}/${id}/movimientos`);
    const movimientos = await res.json();
    
    if (movimientos.length === 0) {
      document.getElementById("tbody-historial").innerHTML = '<tr><td colspan="5" class="cargando">Sin movimientos registrados.</td></tr>';
      return;
    }
    
    let totalDep = 0, totalRet = 0;
    document.getElementById("tbody-historial").innerHTML = movimientos.map(m => {
      const esDeposito = m.tipo === "deposito";
      if (esDeposito) totalDep += Number(m.monto); else totalRet += Number(m.monto);
      return `
      <tr>
        <td>${m.id_movimiento}</td>
        <td><span class="badge badge-${m.tipo}">${m.tipo === "deposito" ? "Depósito" : "Retiro"}</span></td>
        <td class="${esDeposito ? "monto-verde" : "monto-rojo"}">${esDeposito ? "+" : "-"}${formatMonto(Number(m.monto))}</td>
        <td>${formatearFecha(m.fecha)}</td>
        <td>${m.referencia ? escHtml(m.referencia) : '<span style="color:#a0aec0">—</span>'}</td>
      </tr>`;
    }).join("");
    
    document.getElementById("hist-total").innerHTML =
      `<span class="monto-verde">Depósitos: ${formatMonto(totalDep)}</span> &nbsp;|&nbsp; ` +
      `<span class="monto-rojo">Retiros: ${formatMonto(totalRet)}</span> &nbsp;|&nbsp; ` +
      `<strong>${movimientos.length} transacciones</strong>`;
  } catch (err) {
    document.getElementById("tbody-historial").innerHTML = `<tr><td colspan="5" class="cargando">Error al cargar historial.</td></tr>`;
  }
}

function cerrarModalHistorial() {
  document.getElementById("modal-historial").style.display = "none";
}

// ─── CANCELAR EDICIÓN ─────────────────────────────────────────────────────────

function cancelarEdicion() { limpiarFormulario(); ocultarMensaje(); }

// ─── ELIMINAR ─────────────────────────────────────────────────────────────────

function pedirEliminar(id, numeroCuenta) {
  idParaEliminar = id;
  document.getElementById("modal-nombre").textContent = numeroCuenta;
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
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al eliminar. Verifique que la cuenta no tenga movimientos.", "error"); return; }
    mostrarMensaje("Cuenta eliminada exitosamente.", "exito");
    await cargarCuentas();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
}

// ─── LIMPIAR FORMULARIO ───────────────────────────────────────────────────────

function limpiarFormulario() {
  document.getElementById("form-ahorro").reset();
  document.getElementById("ahorro-id").value = "";
  document.getElementById("form-titulo").textContent = "Abrir Nueva Cuenta de Ahorro";
  document.getElementById("btn-guardar").textContent = "✓ Abrir Cuenta";
  document.getElementById("btn-cancelar").style.display = "none";
  document.getElementById("saldo").value = "0.00";
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaApertura").value = hoy;
  document.getElementById("estado").value = "activa";
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
  const fechaLimpia = f.split('T')[0];
  const [a, m, d] = fechaLimpia.split("-");
  return `${d}/${m}/${a}`;
}
function estadoLabel(e) { return { activa:"Activa", inactiva:"Inactiva", cerrada:"Cerrada" }[e] || e; }
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;"); }