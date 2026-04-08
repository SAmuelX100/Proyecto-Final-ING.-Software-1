const API_REPORTES = "/api/reportes";

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
});

// ─── GENERAR REPORTE (Lógica principal) ───────────────────────────────────────

async function generarReporte(e) {
  e.preventDefault();
  
  const filtros = {
    tipo:        document.getElementById("tipo").value,
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin:    document.getElementById("fechaFin").value,
    formato:     document.getElementById("formato").value,
    generadoPor: document.getElementById("generadoPor").value
  };

  const btn = document.getElementById("btn-generar");
  btn.disabled = true;
  btn.textContent = "⌛ Generando...";

  try {
    // Simulamos la llamada a los métodos del diagrama: reporteSocios, reportePrestamos, etc.
    const res = await fetch(`${API_REPORTES}?tipo=${filtros.tipo}&inicio=${filtros.fechaInicio}&fin=${filtros.fechaFin}`);
    if (!res.ok) throw new Error("Error al obtener datos del servidor");
    
    const data = await res.json();
    datosReporteActual = { ...filtros, data };

    // Si el formato es pantalla, mostramos la tabla
    if (filtros.formato === "pantalla") {
      renderizarVistaPrevia(filtros, data);
    } else if (filtros.formato === "pdf") {
      exportarPDF();
    } else {
      exportarExcel();
    }

    actualizarEstadisticas(filtros.tipo);
    mostrarMensaje("Reporte generado exitosamente.", "exito");

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
    columnas = ["ID", "Socio", "Monto", "Plazo", "Tasa", "Estado", "Saldo Pendiente"];
  } else if (filtros.tipo === "aportaciones") {
    columnas = ["ID", "Socio", "Monto", "Fecha", "Tipo", "Estado"];
  } else {
    columnas = ["Concepto", "Ingresos", "Egresos", "Balance"];
  }

  // Renderizar Cabecera
  thead.innerHTML = `<tr>${columnas.map(col => `<th>${col}</th>`).join("")}</tr>`;

  // Renderizar Cuerpo (Simulado con los datos recibidos)
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columnas.length}" class="cargando">No se encontraron registros en este rango.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      ${Object.values(item).map(val => `<td>${formatSiEsNumero(val)}</td>`).join("")}
    </tr>
  `).join("");
}

// ─── EXPORTACIÓN (exportarPDF / exportarExcel) ────────────────────────────────

function exportarPDF() {
  if (!datosReporteActual) return;
  estadisticas.pdf++;
  actualizarCardsEstadisticas();
  
  // Simulación de descarga
  mostrarMensaje("Iniciando descarga de PDF...", "exito");
  console.log("Exportando a PDF:", datosReporteActual);
  // Aquí iría la lógica con jsPDF o similar
}

function exportarExcel() {
  if (!datosReporteActual) return;
  estadisticas.excel++;
  actualizarCardsEstadisticas();
  
  // Simulación de descarga
  mostrarMensaje("Iniciando descarga de Excel...", "exito");
  console.log("Exportando a Excel:", datosReporteActual);
  // Aquí iría la lógica con SheetJS o similar
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function actualizarEstadisticas(tipo) {
  estadisticas.generados++;
  document.getElementById("res-ultimo-tipo").textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  actualizarCardsEstadisticas();
}

function actualizarCardsEstadisticas() {
  document.getElementById("res-total-gen").textContent = estadisticas.generados;
  document.getElementById("res-pdf-count").textContent = estadisticas.pdf;
  document.getElementById("res-excel-count").textContent = estadisticas.excel;
}

function limpiarFiltros() {
  document.getElementById("form-reporte").reset();
  document.getElementById("seccion-vista-previa").style.display = "none";
}

function formatSiEsNumero(val) {
  if (typeof val === 'number') {
    if (val > 1000) return "RD$ " + val.toLocaleString("es-DO", { minimumFractionDigits: 2 });
    return val;
  }
  return val;
}

function formatearFecha(f) {
  if (!f) return "—";
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 4000);
}