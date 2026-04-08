/**
 * Módulo de Autenticación
 * Atributos del diagrama representados en el estado global
 */
let authState = {
  usuario: "",
  token: null,
  sesionActiva: false,
  intentosFallidos: 0
};

const API_AUTH = "/api/auth";

// ─── MÉTODO: login(usuario, contraseña) ───────────────────────────────────────

async function ejecutarLogin(e) {
  e.preventDefault();
  
  const userInp = document.getElementById("usuario").value;
  const passInp = document.getElementById("contrasena").value;
  const btn = document.getElementById("btn-entrar");

  btn.disabled = true;
  btn.textContent = "⌛ Verificando...";

  try {
    // Llamada al método interno de validación
    const esValido = await validarCredenciales(userInp, passInp);

    if (esValido) {
      authState.usuario = userInp;
      authState.sesionActiva = true;
      authState.intentosFallidos = 0;
      
      // Llamada al método interno para generar el token de sesión
      authState.token = generarToken();

      mostrarMensaje("Acceso concedido. Redirigiendo...", "exito");
      
      // Persistencia básica para verificarSesion()
      localStorage.setItem("coop_token", authState.token);
      localStorage.setItem("coop_user", authState.usuario);

      // REDIRECCIÓN AL INDEX (Dashboard Principal)
      setTimeout(() => {
        window.location.href = "./index.html"; 
      }, 1200);
      
    } else {
      authState.intentosFallidos++;
      throw new Error(`Credenciales incorrectas. Intento #${authState.intentosFallidos}`);
    }
  } catch (err) {
    mostrarMensaje(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Entrar al Sistema";
  }
}

// ─── MÉTODO: validarCredenciales() ────────────────────────────────────────────

async function validarCredenciales(u, p) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Usuario de prueba: admin / 1234
      resolve(u === "admin" && p === "1234");
    }, 800);
  });
}

// ─── MÉTODO: #generarToken() ──────────────────────────────────────────────────

function generarToken() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let resultado = 'tk_';
  for (let i = 0; i < 32; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

// ─── MÉTODO: verificarSesion() ────────────────────────────────────────────────

function verificarSesion() {
  const tokenGuardado = localStorage.getItem("coop_token");
  if (tokenGuardado) {
    authState.token = tokenGuardado;
    authState.usuario = localStorage.getItem("coop_user");
    authState.sesionActiva = true;
    return true;
  }
  return false;
}

// ─── MÉTODO: recuperarContrasena(email) ───────────────────────────────────────

function abrirModalRecuperar(e) {
  e.preventDefault();
  document.getElementById("modal-recuperar").style.display = "flex";
}

function cerrarModalRecuperar() {
  document.getElementById("modal-recuperar").style.display = "none";
}

async function enviarRecuperacion() {
  const email = document.getElementById("email-recuperar").value;
  if (!email || !email.includes("@")) {
    alert("Por favor, introduce un correo válido.");
    return;
  }

  console.log(`Enviando correo de recuperación a: ${email}`);
  alert(`Se han enviado las instrucciones a: ${email}`);
  cerrarModalRecuperar();
}

// ─── MÉTODO: logout() ─────────────────────────────────────────────────────────

function logout() {
  authState.usuario = "";
  authState.token = null;
  authState.sesionActiva = false;
  localStorage.removeItem("coop_token");
  localStorage.removeItem("coop_user");
  window.location.href = "./login.html";
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.style.display = "block";
  if (tipo === "error") {
    setTimeout(() => el.style.display = "none", 5000);
  }
}