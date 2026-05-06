document.addEventListener("DOMContentLoaded", () => {
  verificarAcceso();
  cargarDashboard();
});

function verificarAcceso() {
  const token = localStorage.getItem("coop_token");
  const user  = localStorage.getItem("coop_user") || "Administrador";
  if (!token) {
    window.location.href = "./login.html";
    return;
  }
  document.getElementById("user-display").textContent = `Bienvenido, ${user}`;
}

async function cargarDashboard() {
  try {
    const res = await fetch("/api/Dashboard");
    if (!res.ok) throw new Error("No se pudo conectar con el servidor");
    
    const data = await res.json();

    // Actualizar Tarjetas de Estadísticas
    document.getElementById("stat-socios").textContent    = data.stats.socios;
    document.getElementById("stat-prestamos").textContent = formatMonto(data.stats.prestamos);
    document.getElementById("stat-ahorros").textContent   = formatMonto(data.stats.ahorros);
    document.getElementById("stat-capital").textContent   = formatMonto(data.stats.capital);

    // Actualizar Lista de Actividad
    const list = document.getElementById("activity-list");
    if (!data.actividad.length) {
      list.innerHTML = `<p class="empty-msg">No hay actividad reciente registrada.</p>`;
      return;
    }

    list.innerHTML = data.actividad.map(a => `
      <div class="activity-item">
        <span><strong>•</strong> ${a.desc}</span>
        <span class="activity-time">${tiempoRelativo(a.fecha)}</span>
      </div>
    `).join("");

  } catch (err) {
    console.error("Dashboard Error:", err);
    document.getElementById("activity-list").innerHTML = `<p class="error-msg">Error al sincronizar datos.</p>`;
  }
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "./login.html";
}

function formatMonto(v) {
  return "RD$ " + Number(v).toLocaleString("es-DO", { minimumFractionDigits: 2 });
}

function tiempoRelativo(fechaStr) {
  if (!fechaStr) return "Ahora";
  const diff = new Date() - new Date(fechaStr);
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);

  if (min < 60) return `Hace ${min || 1} min`;
  if (hrs < 24) return `Hace ${hrs} hora(s)`;
  return dias === 1 ? "Ayer" : `Hace ${dias} días`;
}