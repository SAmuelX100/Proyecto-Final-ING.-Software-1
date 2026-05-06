const API_REPORTES = "/api/Reporte"; 

let datosReporteActual = null;
let estadisticas = {
  generados: 0,
  pdf: 0,
  excel: 0
};

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Establecer rango por defecto (mes actual)
  const ahora = new Date();
  const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];
  const ultimo  = ahora.toISOString().split("T")[0];
  
  document.getElementById("fechaInicio").value = primero;
  document.getElementById("fechaFin").value = ultimo;
  
  cargarEstadisticas(); 
});

// ─── OBTENER ESTADÍSTICAS DEL SERVIDOR ────────────────────────────────────────
async function cargarEstadisticas() {
  try {
    const res = await fetch(`${API_REPORTES}/estadisticas`);
    if (!res.ok) throw new Error("No se pudieron cargar estadísticas");
    
    estadisticas = await res.json();
    actualizarCardsEstadisticas();
  } catch (err) {
    console.warn("Trabajando sin estadísticas:", err);
  }
}

// ─── GENERAR REPORTE (Lógica principal) ───────────────────────────────────────

async function generarReporte(e) {
  e.preventDefault();
  
  // Obtenemos el usuario activo (Auditoría), si no hay asume ID 1
  const usuarioId = localStorage.getItem("user_id") ? parseInt(localStorage.getItem("user_id")) : 1;

  const filtros = {
    tipo: document.getElementById("tipo").value,
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    formato: document.getElementById("formato").value,
    generadoPor: usuarioId
  };

  const btn = document.getElementById("btn-generar");
  btn.disabled = true;
  btn.textContent = "⌛ Generando...";

  try {
    // 1. GUARDAR registro de reporte en la BD (Historial/Auditoría)
    const resReporte = await fetch(API_REPORTES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtros)
    });
    
    const reporteGuardado = await resReporte.json();
    if (reporteGuardado.error) throw new Error(reporteGuardado.error);

    // 2. OBTENER los datos reales desde la BD filtrados por fecha
    const resDatos = await fetch(`${API_REPORTES}?tipo=${filtros.tipo}&inicio=${filtros.fechaInicio}&fin=${filtros.fechaFin}`);
    if (!resDatos.ok) throw new Error("Error al obtener datos");
    
    const data = await resDatos.json();
    datosReporteActual = { ...filtros, data, idReporte: reporteGuardado.id_reporte };

    // 3. DECISIÓN: Mostrar en pantalla o procesar descarga
    if (filtros.formato === "pantalla") {
      renderizarVistaPrevia(filtros, data);
      mostrarMensaje("✅ Reporte generado exitosamente!", "exito");
    } else if (filtros.formato === "pdf") {
      exportarPDF(reporteGuardado.id_reporte);  
    } else {
      exportarExcel(reporteGuardado.id_reporte); 
    }

    // Actualizamos visuales
    document.getElementById("res-ultimo-tipo").textContent = filtros.tipo.charAt(0).toUpperCase() + filtros.tipo.slice(1);
    cargarEstadisticas(); // Traemos las estadisticas frescas

  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "📊 Generar Reporte";
  }
}

// ─── RENDERIZAR VISTA PREVIA ──────────────────────────────────────────────────

function renderizarVistaPrevia(filtros, data) {
  const seccion = document.getElementById("seccion-vista-previa");
  const thead   = document.getElementById("thead-reporte");
  const tbody   = document.getElementById("tbody-reporte");
  
  document.getElementById("preview-tipo").textContent = filtros.tipo.toUpperCase();
  document.getElementById("preview-rango").textContent = `${formatearFecha(filtros.fechaInicio)} al ${formatearFecha(filtros.fechaFin)}`;
  
  seccion.style.display = "block";
  seccion.scrollIntoView({ behavior: "smooth" });

  // Definir columnas según el tipo de reporte
  let columnas = [];
  if (filtros.tipo === "socios") {
    columnas = ["ID", "Nombre Completo", "DNI", "Email", "Fecha Ingreso", "Estado"];
  } else if (filtros.tipo === "prestamos") {
    columnas = ["ID", "ID Socio", "Monto", "Plazo", "Tasa", "Estado", "Saldo Pendiente"];
  } else if (filtros.tipo === "aportaciones") {
    columnas = ["ID", "ID Socio", "Monto", "Fecha", "Tipo", "Estado"];
  } else {
    columnas = ["Concepto", "Ingresos", "Egresos", "Balance"];
  }

  // Renderizar Cabecera
  thead.innerHTML = `<tr>${columnas.map(col => `<th>${col}</th>`).join("")}</tr>`;

  // Renderizar Cuerpo
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columnas.length}" class="cargando">No se encontraron registros en este rango.</td></tr>`;
    return;
  }

  // Mapear dinámicamente los valores que vienen de la Base de Datos
  tbody.innerHTML = data.map(item => `
    <tr>
      ${Object.values(item).map(val => `<td>${formatSiEsNumero(val)}</td>`).join("")}
    </tr>
  `).join("");
}

// ─── EXPORTACIÓN ──────────────────────────────────────────────────────────────

function exportarPDF(idReporte) {
  if (!datosReporteActual) return;
  mostrarMensaje(`PDF #${idReporte} generado. Iniciando descarga...`, "exito");
  console.log("Exportando a PDF (Datos de la BD):", datosReporteActual);
  // Aquí iría tu librería (ej. jsPDF) usando datosReporteActual.data
}

function exportarExcel(idReporte) {
  if (!datosReporteActual) return;
  mostrarMensaje(`Excel #${idReporte} generado. Iniciando descarga...`, "exito");
  console.log("Exportando a Excel (Datos de la BD):", datosReporteActual);
  // Aquí iría tu librería (ej. SheetJS) usando datosReporteActual.data
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function actualizarCardsEstadisticas() {
  document.getElementById("res-total-gen").textContent = estadisticas.generados;
  document.getElementById("res-pdf-count").textContent = estadisticas.pdf;
  document.getElementById("res-excel-count").textContent = estadisticas.excel;
}

function limpiarFiltros() {
  document.getElementById("form-reporte").reset();
  document.getElementById("seccion-vista-previa").style.display = "none";
  
  const ahora = new Date();
  const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];
  const ultimo  = ahora.toISOString().split("T")[0];
  document.getElementById("fechaInicio").value = primero;
  document.getElementById("fechaFin").value = ultimo;
}

function formatSiEsNumero(val) {
  // Ignorar formateo monetario para IDs o números de cédula
  if (typeof val === 'number') {
    if (val > 1000 && val % 1 !== 0) return "RD$ " + val.toLocaleString("es-DO", { minimumFractionDigits: 2 });
    return val;
  }
  return val;
}

function formatearFecha(f) {
  if (!f) return "—";
  // Evitar error si viene como ISO Timestamp desde PostgreSQL
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