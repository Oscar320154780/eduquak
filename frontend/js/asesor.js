// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de aplicar clase estado en esta pantalla y mantiene conectada la vista con el backend.
function aplicarClaseEstado(elemento, estado) {
  if (!elemento) return;

  elemento.classList.remove(
    "estado-pendiente",
    "estado-verificado",
    "estado-rechazado"
  );

  const valor = String(estado || "").toLowerCase();

  if (valor === "pendiente") {
    elemento.classList.add("estado-pendiente");
  } else if (valor === "verificado") {
    elemento.classList.add("estado-verificado");
  } else if (valor === "rechazado") {
    elemento.classList.add("estado-rechazado");
  }
}

// Se encarga de bloquear accesos asesor no verificado en esta pantalla y mantiene conectada la vista con el backend.
function bloquearAccesosAsesorNoVerificado() {
  const rutasBloqueadas = [
    "/pages/asesorias_asesor.html",
    "/pages/solicitudes_asesor.html",
    "/pages/estadisticas_asesor.html",
    "/pages/materiales_asesor.html",
    "/pages/cuestionarios_asesor.html",
    "/pages/calificaciones_asesor.html"
  ];

  const cards = document.querySelectorAll(".accion-card");

  cards.forEach((card) => {
    const href = card.getAttribute("href");

    if (rutasBloqueadas.includes(href)) {
      card.style.pointerEvents = "none";
      card.style.opacity = "0.55";
      card.style.filter = "grayscale(0.15)";
      card.title = "Función no disponible hasta que tu cuenta sea verificada";
    }
  });
}

// Se encarga de mostrar alerta asesor en esta pantalla y mantiene conectada la vista con el backend.
function mostrarAlertaAsesor(user) {
  const alerta = document.getElementById("alertaValidacionAsesor");
  const titulo = document.getElementById("tituloAlertaAsesor");
  const texto = document.getElementById("textoAlertaAsesor");
  const motivo = document.getElementById("motivoAlertaAsesor");
  const btnAccion = document.getElementById("btnAccionAlertaAsesor");

  if (!alerta || !titulo || !texto || !motivo || !btnAccion) return;

  alerta.classList.add("hidden");
  alerta.classList.remove("alerta-pendiente", "alerta-rechazada");
  motivo.classList.add("hidden");
  motivo.textContent = "";

  const estado = String(user.estado_validacion || "").toLowerCase();
  const fueReenviado = Number(user.documento_reenviado || 0) === 1;

  if (estado === "rechazado") {
    alerta.classList.remove("hidden");
    alerta.classList.add("alerta-rechazada");

    titulo.textContent = "Tu cuenta fue rechazada";
    texto.textContent =
      "Vuelve a enviar tu documento de respaldo para que el administrador lo revise nuevamente.";
    btnAccion.textContent = "Reenviar documento";
    btnAccion.href = "/pages/perfil_asesor.html";

    if (user.motivo_rechazo) {
      motivo.classList.remove("hidden");
      motivo.textContent = `Motivo: ${user.motivo_rechazo}`;
    }
  } else if (estado === "pendiente") {
    alerta.classList.remove("hidden");
    alerta.classList.add("alerta-pendiente");

    if (fueReenviado) {
      titulo.textContent = "Documento reenviado";
      texto.textContent =
        "Tu archivo corregido ya fue enviado otra vez y está en revisión del administrador.";
    } else {
      titulo.textContent = "Tu cuenta está en revisión";
      texto.textContent =
        "Tu perfil de asesor todavía está siendo revisado. Algunas funciones seguirán limitadas por ahora.";
    }

    btnAccion.textContent = "Ver mi perfil";
    btnAccion.href = "/pages/perfil_asesor.html";
  }
}

// Se encarga de cargar perfil en esta pantalla y mantiene conectada la vista con el backend.
async function cargarPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Perfil asesor:", data);

    if (!data.ok) {
      if (window.EduQuakUI) {
        await window.EduQuakUI.error(
          "No se pudo cargar el perfil",
          data.message || "No se pudo cargar el perfil"
        );
      } else {
        alert(data.message || "No se pudo cargar el perfil");
      }
      return;
    }

    const user = data.user;

    if (user.rol !== "asesor") {
      if (window.EduQuakUI) {
        await window.EduQuakUI.warning(
          "Acceso no permitido",
          "Esta página es solo para asesores"
        );
      } else {
        alert("Esta página es solo para asesores");
      }
      window.location.href = "/pages/login.html";
      return;
    }

    const elNombre = document.getElementById("nombre");
    const elEstado = document.getElementById("estado");

    if (elNombre) elNombre.textContent = user.nombre || "-";

    if (elEstado) {
      const estado = user.estado_validacion || "-";
      elEstado.textContent = estado;
      aplicarClaseEstado(elEstado, estado);
    }

    if (user.estado_validacion !== "verificado") {
      bloquearAccesosAsesorNoVerificado();
    }

    mostrarAlertaAsesor(user);
  } catch (error) {
    console.error("Error al cargar perfil del asesor:", error);
  }
}

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/pages/login.html";
});

cargarPerfil();