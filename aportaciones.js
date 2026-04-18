const API_BASE   = "/api/aportaciones";
const API_SOCIOS = "/api/socios";

let aportacionesList = [];
let idParaEliminar   = null;

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fecha").value = hoy;
  cargarSociosSelect();
  cargarAportaciones();
});

async function cargarSociosSelect() {
  try {
    const res = await fetch(API_SOCIOS);
    if (!res.ok) throw new Error("Error al cargar socios");
    const socios = await res.json();
    const select = document.getElementById("socioId");
    socios.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.nombre} ${s.apellido} — ${s.dni}`;
      select.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando socios:", err); }
}

async function cargarAportaciones() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Error al cargar aportaciones");
    aportacionesList = await res.json();
    actualizarResumen(aportacionesList);
    renderTabla(aportacionesList);
    document.getElementById("resumen-grid").style.display = "grid";
  } catch (err) {
    mostrarMensaje("Error al conectar con el servidor: " + err.message, "error");
    document.getElementById("tbody-aportaciones").innerHTML =
      '<tr><td colspan="7" class="cargando">No se pudieron cargar los datos.</td></tr>';
  }
}

function actualizarResumen(lista) {
  const total     = lista.reduce((s, a) => s + Number(a.monto), 0);
  const validadas = lista.filter(a => a.estado === "validada").length;
  const pendientes= lista.filter(a => a.estado === "pendiente").length;
  document.getElementById("res-total").textContent      = formatMonto(total);
  document.getElementById("res-validadas").textContent  = validadas;
  document.getElementById("res-pendientes").textContent = pendientes;
  document.getElementById("res-count").textContent      = lista.length;
}

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-aportaciones");
  document.getElementById("total-registros").textContent = `Total: ${lista.length} registro(s)`;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="cargando">No hay aportaciones registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(a => {
    const yaValidada = a.estado === "validada";
    return `
    <tr>
      <td>${a.id}</td>
      <td>${escHtml(a.socioNombre || `Socio #${a.socioId}`)}</td>
      <td><span class="monto">${formatMonto(Number(a.monto))}</span></td>
      <td>${formatearFecha(a.fecha)}</td>
      <td><span class="badge badge-${a.tipo}">${tipoLabel(a.tipo)}</span></td>
      <td><span class="badge badge-${a.estado}">${estadoLabel(a.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-validar" onclick="validarAportacion(${a.id})" ${yaValidada ? "disabled" : ""}>✓ Validar</button>
          <button class="btn btn-editar" onclick="editarAportacion(${a.id})">✏ Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${a.id}, '${escAttr(a.socioNombre || "")}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function filtrarTabla() {
  const q      = document.getElementById("buscar").value.toLowerCase();
  const tipo   = document.getElementById("filtro-tipo").value;
  const estado = document.getElementById("filtro-estado").value;
  const filtrados = aportacionesList.filter(a => {
    return (a.socioNombre || "").toLowerCase().includes(q) &&
           (!tipo   || a.tipo === tipo) &&
           (!estado || a.estado === estado);
  });
  renderTabla(filtrados);
}

async function guardarAportacion(e) {
  e.preventDefault();
  const id = document.getElementById("aportacion-id").value;
  const datos = {
    socioId: Number(document.getElementById("socioId").value),
    monto:   Number(document.getElementById("monto").value),
    fecha:   document.getElementById("fecha").value,
    tipo:    document.getElementById("tipo").value,
    estado:  document.getElementById("estado").value,
  };
  if (!datos.socioId || !datos.monto || !datos.fecha) {
    mostrarMensaje("Los campos Socio, Monto y Fecha son obligatorios.", "error"); return;
  }
  if (datos.monto <= 0) {
    mostrarMensaje("El monto debe ser mayor a cero.", "error"); return;
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
    mostrarMensaje(id ? "Aportación actualizada exitosamente." : `Aportación registrada (ID: ${resultado.id}).`, "exito");
    limpiarFormulario();
    await cargarAportaciones();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally { btn.disabled = false; }
}

async function editarAportacion(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error("No encontrada");
    const a = await res.json();
    document.getElementById("aportacion-id").value = a.id;
    document.getElementById("socioId").value       = a.socioId;
    document.getElementById("monto").value          = Number(a.monto).toFixed(2);
    document.getElementById("fecha").value          = a.fecha || "";
    document.getElementById("tipo").value           = a.tipo;
    document.getElementById("estado").value         = a.estado;
    document.getElementById("form-titulo").textContent = `Editar Aportación #${a.id}`;
    document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
    document.getElementById("btn-cancelar").style.display = "inline-block";
    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  } catch (err) { mostrarMensaje("No se pudo cargar: " + err.message, "error"); }
}

async function validarAportacion(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}/validar`, { method: "PUT" });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al validar.", "error"); return; }
    mostrarMensaje("Aportación validada exitosamente.", "exito");
    await cargarAportaciones();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
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
  cerrarModal();
  try {
    const res = await fetch(`${API_BASE}/${idParaEliminar}`, { method: "DELETE" });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al eliminar.", "error"); return; }
    mostrarMensaje("Aportación eliminada exitosamente.", "exito");
    await cargarAportaciones();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
}

function limpiarFormulario() {
  document.getElementById("form-aportacion").reset();
  document.getElementById("aportacion-id").value = "";
  document.getElementById("form-titulo").textContent = "Registrar Nueva Aportación";
  document.getElementById("btn-guardar").textContent = "✓ Registrar Aportación";
  document.getElementById("btn-cancelar").style.display = "none";
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fecha").value  = hoy;
  document.getElementById("tipo").value   = "cuota_mensual";
  document.getElementById("estado").value = "pendiente";
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
function formatearFecha(f) { if (!f) return "—"; const [a,m,d] = f.split("-"); return `${d}/${m}/${a}`; }
function tipoLabel(t) { return { cuota_mensual:"Cuota Mensual", aportacion_extraordinaria:"Extraordinaria", ahorro:"Ahorro", prestamo:"Préstamo" }[t] || t; }
function estadoLabel(e) { return { pendiente:"Pendiente", validada:"Validada", rechazada:"Rechazada" }[e] || e; }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;"); }