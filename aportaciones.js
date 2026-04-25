const API_BASE   = "/api/Aportacion"; 
const API_SOCIOS = "/api/Socio";      

let aportacionesList = [];
let sociosDict       = {}; // ✅ Diccionario para búsqueda rápida de nombres
let idParaEliminar   = null;

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fecha").value = hoy;
  await cargarSociosSelect(); // ✅ Cargamos socios primero
  await cargarAportaciones();
});

// ─── SOCIOS SELECT ────────────────────────────────────────────────────────────

async function cargarSociosSelect() {
  try {
    const res = await fetch(API_SOCIOS);
    if (!res.ok) throw new Error("Error al cargar socios");
    const socios = await res.json();
    const select = document.getElementById("socioId");
    
    socios.forEach(s => {
      sociosDict[s.id_socio] = `${s.nombre} ${s.apellido}`; 
      const opt = document.createElement("option");
      opt.value = s.id_socio; // ✅ BD original
      opt.textContent = `${s.nombre} ${s.apellido} — ${s.dni}`;
      select.appendChild(opt);
    });
  } catch (err) { console.error("Error cargando socios:", err); }
}

// ─── CARGAR APORTACIONES ──────────────────────────────────────────────────────

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

// ─── RESUMEN ──────────────────────────────────────────────────────────────────

function actualizarResumen(lista) {
  const total     = lista.reduce((s, a) => s + Number(a.monto), 0);
  const validadas = lista.filter(a => a.estado === "validada").length;
  const pendientes= lista.filter(a => a.estado === "pendiente").length;
  document.getElementById("res-total").textContent      = formatMonto(total);
  document.getElementById("res-validadas").textContent  = validadas;
  document.getElementById("res-pendientes").textContent = pendientes;
  document.getElementById("res-count").textContent      = lista.length;
}

// ─── RENDERIZAR TABLA ─────────────────────────────────────────────────────────

function renderTabla(lista) {
  const tbody = document.getElementById("tbody-aportaciones");
  document.getElementById("total-registros").textContent = `Total: ${lista.length} registro(s)`;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="cargando">No hay aportaciones registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(a => {
    const yaValidada = a.estado === "validada";
    const nombreSocio = sociosDict[a.id_socio] || `Socio #${a.id_socio}`; // ✅ Mapeo de nombre
    
    return `
    <tr>
      <td>${a.id_aportacion}</td>
      <td>${escHtml(nombreSocio)}</td>
      <td><span class="monto">${formatMonto(Number(a.monto))}</span></td>
      <td>${formatearFecha(a.fecha)}</td>
      <td><span class="badge badge-${a.tipo}">${tipoLabel(a.tipo)}</span></td>
      <td><span class="badge badge-${a.estado}">${estadoLabel(a.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-validar" onclick="validarAportacion(${a.id_aportacion})" ${yaValidada ? "disabled" : ""}>✓ Validar</button>
          <button class="btn btn-editar" onclick="editarAportacion(${a.id_aportacion})">✏ Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${a.id_aportacion}, '${escAttr(nombreSocio)}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ─── FILTRAR ──────────────────────────────────────────────────────────────────

function filtrarTabla() {
  const q      = document.getElementById("buscar").value.toLowerCase();
  const tipo   = document.getElementById("filtro-tipo").value;
  const estado = document.getElementById("filtro-estado").value;
  const filtrados = aportacionesList.filter(a => {
    const nombreSocio = sociosDict[a.id_socio] || "";
    return nombreSocio.toLowerCase().includes(q) &&
           (!tipo   || a.tipo === tipo) &&
           (!estado || a.estado === estado);
  });
  renderTabla(filtrados);
}

// ─── GUARDAR APORTACIÓN (INCLUYE AUDITORÍA DE VALIDACIÓN) ───────────────────

async function guardarAportacion(e) {
  e.preventDefault();
  const id = document.getElementById("aportacion-id").value;
  const estadoSeleccionado = document.getElementById("estado").value;
  
  // ✅ Mapeo camelCase
  const datos = {
    idSocio: Number(document.getElementById("socioId").value),
    monto:   String(Number(document.getElementById("monto").value)),
    fecha:   document.getElementById("fecha").value,
    tipo:    document.getElementById("tipo").value,
    estado:  estadoSeleccionado,
  };

  // 🔥 Lógica de auditoría: Quién lo validó
  if (estadoSeleccionado === "validada") {
    const ap = id ? aportacionesList.find(x => x.id_aportacion == id) : null;
    datos.validadoPor = (ap && ap.validado_por) 
        ? ap.validado_por 
        : Number(localStorage.getItem("user_id"));
  } else {
    datos.validadoPor = null;
  }

  if (!datos.idSocio || !datos.monto || !datos.fecha) {
    mostrarMensaje("Los campos Socio, Monto y Fecha son obligatorios.", "error"); return;
  }
  if (Number(datos.monto) <= 0) {
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
    mostrarMensaje(id ? "Aportación actualizada exitosamente." : `Aportación registrada (ID: ${resultado.id_aportacion}).`, "exito");
    limpiarFormulario();
    await cargarAportaciones();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally { btn.disabled = false; }
}

// ─── EDITAR (DIRECTO DESDE LA MEMORIA) ────────────────────────────────────────

function editarAportacion(id) {
  try {
    const a = aportacionesList.find(x => x.id_aportacion === id);
    if (!a) throw new Error("Aportación no encontrada en la lista actual");

    document.getElementById("aportacion-id").value  = a.id_aportacion;
    document.getElementById("socioId").value        = a.id_socio;
    document.getElementById("monto").value          = Number(a.monto).toFixed(2);
    document.getElementById("fecha").value          = a.fecha?.split('T')[0] || ""; // ✅ Quitar hora
    document.getElementById("tipo").value           = a.tipo;
    document.getElementById("estado").value         = a.estado;
    
    document.getElementById("form-titulo").textContent = `Editar Aportación #${a.id_aportacion}`;
    document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
    document.getElementById("btn-cancelar").style.display = "inline-block";
    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  } catch (err) { mostrarMensaje("No se pudo cargar: " + err.message, "error"); }
}

// ─── VALIDAR RÁPIDO (BOTÓN EN LA TABLA) ───────────────────────────────────────

async function validarAportacion(id) {
  try {
    const ap = aportacionesList.find(a => a.id_aportacion === id);
    
    // 🔥 Reutilizamos la API genérica en lugar de un endpoint personalizado
    const datosActualizados = {
        idSocio: ap.id_socio,
        monto:   ap.monto,
        fecha:   ap.fecha?.split('T')[0],
        tipo:    ap.tipo,
        estado:  "validada",
        validadoPor: Number(localStorage.getItem("user_id")) // ID del usuario actual
    };

    const res = await fetch(`${API_BASE}/${id}`, { 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosActualizados)
    });
    
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al validar.", "error"); return; }
    mostrarMensaje("Aportación validada exitosamente.", "exito");
    await cargarAportaciones();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
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
  
  try {
    const res = await fetch(`${API_BASE}/${idParaEliminar}`, { method: "DELETE" });
    const resultado = await res.json();
    if (!res.ok) { mostrarMensaje(resultado.error || "Error al eliminar.", "error"); return; }
    mostrarMensaje("Aportación eliminada exitosamente.", "exito");
    cerrarModal();
    await cargarAportaciones();
  } catch (err) { mostrarMensaje("Error de conexión: " + err.message, "error"); }
}

// ─── LIMPIAR FORMULARIO ───────────────────────────────────────────────────────

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

function formatMonto(v) { return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatearFecha(f) { 
  if (!f) return "—"; 
  const fechaLimpia = f.split('T')[0]; // ✅ Remueve la hora de timestamps
  const [a,m,d] = fechaLimpia.split("-"); 
  return `${d}/${m}/${a}`; 
}
function tipoLabel(t) { return { cuota_mensual:"Cuota Mensual", aportacion_extraordinaria:"Extraordinaria", ahorro:"Ahorro", prestamo:"Préstamo" }[t] || t; }
function estadoLabel(e) { return { pendiente:"Pendiente", validada:"Validada", rechazada:"Rechazada" }[e] || e; }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,"&quot;"); }