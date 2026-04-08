/**
 * Lógica del Dashboard Principal
 */

document.addEventListener("DOMContentLoaded", () => {
  verificarAcceso();
  cargarEstadisticas();
  cargarActividadReciente();
});

// ─── VERIFICAR SESIÓN (Método verificarSesion del diagrama) ───────────────────

function verificarAcceso() {
  const token = localStorage.getItem("coop_token");
  const user  = localStorage.getItem("coop_user");

  if (!token) {
    window.location.href = "./login.html";
    return;
  }

  document.getElementById("user-display").textContent = `Bienvenido, ${user}`;
}

// ─── CARGAR ESTADÍSTICAS GLOBALES ─────────────────────────────────────────────

async function cargarEstadisticas() {
  try {
    // En un entorno real, llamaríamos a una API de resumen global
    // const res = await fetch("/api/dashboard/stats");
    // const data = await res.json();

    // Simulación de datos para el Dashboard
    document.getElementById("stat-socios").textContent = "154";
    document.getElementById("stat-prestamos").textContent = formatMonto(1250000);
    document.getElementById("stat-ahorros").textContent = formatMonto(850400);
    document.getElementById("stat-capital").textContent = formatMonto(2100400);

  } catch (err) { console.error("Error cargando estadísticas:", err); }
}

// ─── CARGAR ACTIVIDAD RECIENTE ────────────────────────────────────────────────

function cargarActividadReciente() {
  const list = document.getElementById("activity-list");
  
  // Simulación de logs de actividad
  const actividades = [
    { desc: "Nuevo préstamo aprobado para Juan Pérez", hora: "Hace 5 min" },
    { desc: "Pago de cuota #4 registrado - ID: 4502", hora: "Hace 12 min" },
    { desc: "Nuevo socio registrado: María García", hora: "Hace 1 hora" },
    { desc: "Reporte financiero mensual generado", hora: "Hace 3 horas" }
  ];

  list.innerHTML = actividades.map(a => `
    <div class="activity-item">
      <span><strong>•</strong> ${a.desc}</span>
      <span class="activity-time">${a.hora}</span>
    </div>
  `).join("");
}

// ─── CERRAR SESIÓN (Método logout del diagrama) ───────────────────────────────

function cerrarSesion() {
  localStorage.removeItem("coop_token");
  localStorage.removeItem("coop_user");
  window.location.href = "./login.html";
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function formatMonto(v) {
  return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2 });
}