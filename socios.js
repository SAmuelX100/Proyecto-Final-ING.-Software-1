const API_BASE = "/api/Socio"; ;

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
      <td>${s.id}</td>
      <td>${escHtml(s.nombre)} ${escHtml(s.apellido)}</td>
      <td>${escHtml(s.dni)}</td>
      <td>${s.email ? escHtml(s.email) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${s.telefono ? escHtml(s.telefono) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${s.direccion ? escHtml(s.direccion) : '<span style="color:#a0aec0">—</span>'}</td>
      <td>${formatearFecha(s.fechaIngreso)}</td>
      <td><span class="badge badge-${s.estado}">${escHtml(s.estado)}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-editar" onclick="editarSocio(${s.id})">✏ Editar</button>
          <button class="btn btn-eliminar" onclick="pedirEliminar(${s.id}, '${escAttr(s.nombre)} ${escAttr(s.apellido)}')">🗑 Eliminar</button>
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
    nombre:       document.getElementById("nombre").value.trim(),
    apellido:     document.getElementById("apellido").value.trim(),
    dni:          document.getElementById("dni").value.trim(),
    email:        document.getElementById("email").value.trim() || null,
    telefono:     document.getElementById("telefono").value.trim() || null,
    direccion:    document.getElementById("direccion").value.trim() || null,
    fechaIngreso: document.getElementById("fechaIngreso").value || null,
    estado:       document.getElementById("estado").value,
  };

  if (!datos.nombre || !datos.apellido || !datos.dni) {
    mostrarMensaje("Los campos Nombre, Apellido y Cédula son obligatorios.", "error");
    return;
  }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;

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
      id ? `Socio actualizado exitosamente.` : `Socio registrado exitosamente (ID: ${resultado.id}).`,
      "exito"
    );
    limpiarFormulario();
    await cargarSocios();
  } catch (err) {
    mostrarMensaje("Error de conexión: " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// ─── EDITAR SOCIO ─────────────────────────────────────────────────────────────

async function editarSocio(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error("Socio no encontrado");
    const s = await res.json();

    document.getElementById("socio-id").value      = s.id;
    document.getElementById("nombre").value         = s.nombre;
    document.getElementById("apellido").value       = s.apellido;
    document.getElementById("dni").value            = s.dni;
    document.getElementById("email").value          = s.email || "";
    document.getElementById("telefono").value       = s.telefono || "";
    document.getElementById("direccion").value      = s.direccion || "";
    document.getElementById("fechaIngreso").value   = s.fechaIngreso || "";
    document.getElementById("estado").value         = s.estado;

    document.getElementById("form-titulo").textContent = `Editar Socio — ${s.nombre} ${s.apellido}`;
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

// ─── ELIMINAR SOCIO ───────────────────────────────────────────────────────────

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

    if (!res.ok) {
      mostrarMensaje(resultado.error || "Error al eliminar.", "error");
      return;
    }

    mostrarMensaje("Socio eliminado exitosamente.", "exito");
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
  const [anio, mes, dia] = fecha.split("-");
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