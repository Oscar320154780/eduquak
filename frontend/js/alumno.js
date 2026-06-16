const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

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

function bloquearAccesosAlumnoNoVerificado() {
  const rutasBloqueadas = [
    "/pages/buscar_asesores.html",
    "/pages/mis_asesorias.html",
    "/pages/materiales.html",
    "/pages/cuestionarios.html",
    "/pages/grupales.html",
    "/pages/calificar.html"
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

function formatearFechaSancion(valor) {
  if (!valor) return "la fecha indicada";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mostrarAlertaAlumno(user) {
  const alerta = document.getElementById("alertaValidacionAlumno");
  const titulo = document.getElementById("tituloAlertaAlumno");
  const texto = document.getElementById("textoAlertaAlumno");
  const motivo = document.getElementById("motivoAlertaAlumno");
  const btnAccion = document.getElementById("btnAccionAlertaAlumno");

  if (!alerta || !titulo || !texto || !motivo || !btnAccion) return;

  alerta.classList.add("hidden");
  alerta.classList.remove("alerta-pendiente", "alerta-rechazada", "alerta-sancionada");
  motivo.classList.add("hidden");
  motivo.textContent = "";

  const estado = String(user.estado_validacion || "").toLowerCase();
  const fueReenviado = Number(user.documento_reenviado || 0) === 1;

  if (user.sancion_activa && user.sancion) {
    alerta.classList.remove("hidden");
    alerta.classList.add("alerta-sancionada");

    titulo.textContent = "Tu cuenta está sancionada temporalmente";
    texto.textContent = `No podrás usar funciones principales hasta ${formatearFechaSancion(user.sancion.fecha_fin)}.`;
    btnAccion.textContent = "Ver mi perfil";
    btnAccion.href = "/pages/perfil_alumno.html";

    motivo.classList.remove("hidden");
    motivo.textContent = `Motivo: ${user.sancion.motivo || "Incumplimiento de normas"}`;
    return;
  }

  if (estado === "rechazado") {
    alerta.classList.remove("hidden");
    alerta.classList.add("alerta-rechazada");

    titulo.textContent = "Tu cuenta fue rechazada";
    texto.textContent =
      "Vuelve a enviar tu documento para que el administrador lo revise nuevamente.";
    btnAccion.textContent = "Reenviar documento";
    btnAccion.href = "/pages/perfil_alumno.html";

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
        "Tu documento todavía está siendo revisado. Algunas funciones seguirán bloqueadas por ahora.";
    }

    btnAccion.textContent = "Ver mi perfil";
    btnAccion.href = "/pages/perfil_alumno.html";
  }
}

async function cargarPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Perfil alumno:", data);

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

    if (user.rol !== "alumno") {
      if (window.EduQuakUI) {
        await window.EduQuakUI.warning(
          "Acceso no permitido",
          "Esta página es solo para alumnos"
        );
      } else {
        alert("Esta página es solo para alumnos");
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

    if (user.estado_validacion !== "verificado" || user.sancion_activa) {
      bloquearAccesosAlumnoNoVerificado();
    }

    mostrarAlertaAlumno(user);
  } catch (error) {
    console.error("Error al cargar perfil:", error);
  }
}

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/pages/login.html";
});

cargarPerfil();
