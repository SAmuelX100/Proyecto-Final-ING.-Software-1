const API_BASE = "/api/Socio"; 

let sociosList = [];
let idParaEliminar = null;

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaIngreso").value = hoy;
  cargarSocios();
});

// ─── CARGAR LISTA DE SOCIOS ───────────────────────────────────────────────────
async function cargarSocios() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Error al cargar socios");
    sociosList = await res.json();
    renderTabla(sociosList);
  } catch (err) {
    mostrarMensaje("Error al conectar con el servidor: " + err.message, "error");
    document.getElementById("tbody-socios").innerHTML =
      '<tr><td colspan="9" class="cargando">No se pudieron cargar los datos.</td></tr>';
  }
}

// ─── RENDERIZAR TABLA ─────────────────────────────────────────────────────────
function renderTabla(lista) {
  const tbody = document.getElementById("tbody-socios");
  document.getElementById("total-socios").textContent = `Total: ${lista.length} socio(s)`;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="cargando">No hay socios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(s => `
    <tr>
      <td>${s.id_socio || '—'}</td>
      <td>${escHtml(s.nombre || '')} ${escHtml(s.apellido || '')}</td>
      <td>${escHtml(s.dni || '')}</td>
      <td>${s.email ? escHtml(s.email) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${s.telefono ? escHtml(s.telefono) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${s.direccion ? escHtml(s.direccion) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${formatearFecha(s.fecha_ingreso)}</td>
      <td><span class="badge badge-${s.estado || 'pendiente'}">${escHtml(s.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-editar" onclick="editarSocio(${s.id_socio})">✏ Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${s.id_socio}, '${escAttr((s.nombre || '') + ' ' + (s.apellido || ''))}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ─── FILTRO / BÚSQUEDA ────────────────────────────────────────────────────────
function filtrarTabla() {
  const q = document.getElementById("buscar").value.toLowerCase();
  const filtrados = sociosList.filter(s =>
    (s.nombre + " " + s.apellido).toLowerCase().includes(q) ||
    s.dni.toLowerCase().includes(q) ||
    (s.email || "").toLowerCase().includes(q)
  );
  renderTabla(filtrados);
}

// ─── GUARDAR (REGISTRAR O ACTUALIZAR) ────────────────────────────────────────
async function guardarSocio(e) {
  e.preventDefault();

  const id = document.getElementById("socio-id").value;
  const datos = {
    id_usuario: parseInt(localStorage.getItem("user_id")) || 1,
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    dni: document.getElementById("dni").value.trim(),
    email: document.getElementById("email").value.trim() || null,
    telefono: document.getElementById("telefono").value.trim() || null,
    direccion: document.getElementById("direccion").value.trim() || null,
    fecha_ingreso: document.getElementById("fechaIngreso").value, // ✅ snake_case consistente
    estado: document.getElementById("estado").value,
  };

  if (!datos.nombre || !datos.apellido || !datos.dni) {
    mostrarMensaje("Los campos Nombre, Apellido y Cédula son obligatorios.", "error");
    return;
  }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  btn.textContent = "⏳ Guardando...";

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    } else {
      res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
    }

    const resultado = await res.json();

    if (!res.ok) {
      mostrarMensaje(resultado.error || "Error al guardar socio.", "error");
      return;
    }

    mostrarMensaje(
      id ? `Socio actualizado exitosamente.` : `Socio registrado exitosamente (ID: ${resultado.id_socio}).`,
      "exito"
    );
    limpiarFormulario();
    await cargarSocios();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = id ? "✓ Guardar Cambios" : "✓ Registrar Socio";
  }
}

// ─── EDITAR SOCIO (✅ 100% FUNCIONAL) ──────────────────────────────────────────
async function editarSocio(id) {
  try {
    // ✅ GET individual: /api/Socio?id=123
    const res = await fetch(`${API_BASE}?id=${id}`);
    
    if (!res.ok) {
      throw new Error("Socio no encontrado");
    }
    
    const socio = await res.json();
    
    if (!socio) {
      throw new Error("Socio no encontrado en la base de datos");
    }

    // ✅ Cargar datos en formulario (manejo consistente de fechas)
    document.getElementById("socio-id").value = socio.id_socio;
    document.getElementById("nombre").value = socio.nombre || '';
    document.getElementById("apellido").value = socio.apellido || '';
    document.getElementById("dni").value = socio.dni || '';
    document.getElementById("email").value = socio.email || '';
    document.getElementById("telefono").value = socio.telefono || '';
    document.getElementById("direccion").value = socio.direccion || '';
    document.getElementById("fechaIngreso").value = socio.fecha_ingreso?.split('T')[0] || ''; // ✅ Formato YYYY-MM-DD
    document.getElementById("estado").value = socio.estado || 'activo';

    document.getElementById("form-titulo").textContent = `Editar Socio — ${socio.nombre} ${socio.apellido}`;
    document.getElementById("btn-guardar").textContent = "✓ Guardar Cambios";
    document.getElementById("btn-cancelar").style.display = "inline-block";

    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    mostrarMensaje("No se pudo cargar el socio: " + err.message, "error");
  }
}

// ─── CANCELAR EDICIÓN ─────────────────────────────────────────────────────────
function cancelarEdicion() {
  limpiarFormulario();
  ocultarMensaje();
}

// ─── ELIMINAR SOCIO (✅ 100% FUNCIONAL) ───────────────────────────────────────
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
    // ✅ DELETE: /api/Socio/123
    const res = await fetch(`${API_BASE}/${idParaEliminar}`, { 
      method: "DELETE" 
    });
    
    const resultado = await res.json();

    if (!res.ok) {
      mostrarMensaje(resultado.error || "Error al eliminar.", "error");
      return;
    }

    mostrarMensaje("Socio eliminado exitosamente.", "exito");
    cerrarModal();
    await cargarSocios();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  }
}

// ─── LIMPIAR FORMULARIO ───────────────────────────────────────────────────────
function limpiarFormulario() {
  document.getElementById("form-socio").reset();
  document.getElementById("socio-id").value = "";
  document.getElementById("form-titulo").textContent = "Registrar Nuevo Socio";
  document.getElementById("btn-guardar").textContent = "✓ Registrar Socio";
  document.getElementById("btn-cancelar").style.display = "none";
  
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaIngreso").value = hoy;
  document.getElementById("estado").value = "activo";
}

// ─── MENSAJES ─────────────────────────────────────────────────────────────────
function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(ocultarMensaje, 5000);
}

function ocultarMensaje() {
  document.getElementById("mensaje").style.display = "none";
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function formatearFecha(fecha) {
  if (!fecha) return '<span style="color:#a0aec0">—</span>';
  // ✅ Manejo consistente de fechas (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS)
  const fechaLimpia = fecha.split('T')[0];
  const [anio, mes, dia] = fechaLimpia.split("-");
  return `${dia}/${mes}/${anio}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}