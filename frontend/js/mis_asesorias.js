// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.

const API = window.EDUQUAK_API_URL || "";

const token = localStorage.getItem("token");

let asesoriasCache = [];

let estadoAlumno = null;

let filtroEstadoActivo = "todas";

if (!token) {
  window.location.href = "/pages/login.html";
}

// obtener perfil
async function obtenerMiPerfil() {

  try {

    const res = await fetch(
      `${API}/api/users/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!data.ok) {
      return null;
    }

    return data.user || null;

  } catch (error) {

    console.error(
      "Error al obtener perfil:",
      error
    );

    return null;
  }
}

// alumno bloqueado
function alumnoNoVerificado() {
  return estadoAlumno !== "verificado";
}

// render bloqueado
function renderBloqueado() {

  const contenedor =
    document.getElementById(
      "listaMisAsesorias"
    );

  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada
      para usar asesorías.
    </div>
  `;

  document
    .querySelectorAll(".tab-estado-btn")
    .forEach((btn) => {
      btn.disabled = true;
    });
}

// clases de estado
function estadoClase(estado) {

  const valor =
    (estado || "").toLowerCase();

  if (valor === "aceptada") {
    return "aceptada";
  }

  if (valor === "finalizada") {
    return "finalizada";
  }

  if (valor === "rechazada") {
    return "rechazada";
  }

  return "pendiente";
}

function mostrarAlertaVideo(mensaje) {
  if (window.Swal) {
    Swal.fire({
      icon: "info",
      title: "Videollamada no disponible",
      text: mensaje,
      confirmButtonText: "Entendido"
    });
    return;
  }

  alert(mensaje);
}

// abrir jitsi con validación de horario
async function entrarAJitsi(room, idAsesoria) {

  if (!idAsesoria) {
    mostrarAlertaVideo("No se pudo validar esta asesoría. Intenta recargar la página.");
    return;
  }

  try {
    const res = await fetch(
      `${API}/api/asesorias/${idAsesoria}/video-access`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!data.ok) {
      mostrarAlertaVideo(
        data.message ||
        "La videollamada estará disponible 10 minutos antes de la hora agendada."
      );
      return;
    }

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const nombre =
      user.nombre || "Alumno";

    const sala = data.room_name || room;

    window.open(
      `/pages/videollamada.html?id=${encodeURIComponent(idAsesoria)}&room=${encodeURIComponent(sala)}&name=${encodeURIComponent(nombre)}&role=alumno`,
      "_blank"
    );
  } catch (error) {
    console.error("Error al validar videollamada:", error);
    mostrarAlertaVideo("No se pudo validar la videollamada. Intenta de nuevo.");
  }
}

// abrir chat de asesoría en modal
function abrirChat(idAsesoria) {
  if (window.EduQuakChatModal) {
    window.EduQuakChatModal.open(idAsesoria);
    return;
  }

  if (window.Swal) {
    Swal.fire({
      icon: "error",
      title: "Chat no disponible",
      text: "No se pudo cargar la ventana de chat. Recarga la página e intenta de nuevo.",
      confirmButtonText: "Entendido"
    });
    return;
  }

  alert("No se pudo cargar la ventana de chat. Recarga la página e intenta de nuevo.");
}

// modal reporte
function abrirModalReporte(idAsesoria) {

  const existente =
    document.getElementById(
      "modalReporte"
    );

  if (existente) {
    existente.remove();
  }

  const modal =
    document.createElement("div");

  modal.id = "modalReporte";

  modal.className = "modal-reporte";

  modal.innerHTML = `

    <div class="modal-content">

      <h2>
        Reportar asesoría
      </h2>

      <form id="formReporte">

        <input
          type="text"
          id="motivoReporte"
          placeholder="Motivo"
          required
        />

        <textarea
          id="descripcionReporte"
          placeholder="Describe el problema"
          required
        ></textarea>

        <input
          type="file"
          id="evidenciaReporte"
          accept="image/*,.pdf"
        />

        <div class="modal-actions">

          <button type="submit">
            Enviar reporte
          </button>

          <button
            type="button"
            id="cerrarModal"
          >
            Cancelar
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("cerrarModal")
    .addEventListener(
      "click",
      () => modal.remove()
    );

  const formReporte =
    document.getElementById(
      "formReporte"
    );

  formReporte.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      const formData =
        new FormData();

      formData.append(
        "motivo",
        document.getElementById(
          "motivoReporte"
        ).value
      );

      formData.append(
        "descripcion",
        document.getElementById(
          "descripcionReporte"
        ).value
      );

      const archivo =
        document.getElementById(
          "evidenciaReporte"
        ).files[0];

      if (archivo) {

        formData.append(
          "evidencia",
          archivo
        );
      }

      try {

        const res = await fetch(
          `${API}/api/asesorias/${idAsesoria}/reportar`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`
            },

            body: formData
          }
        );

        const data =
          await res.json();

        if (data.ok) {

          if (window.EduQuakUI) {
            window.EduQuakUI.toast(
              "success",
              "Reporte enviado correctamente"
            );
          } else {
            alert("Reporte enviado correctamente");
          }

// actualizar cache local
asesoriasCache = asesoriasCache.map(
  (a) => {

    if (
      a.id_asesoria == idAsesoria
    ) {

      return {
        ...a,
        reporte_enviado: 1
      };
    }

    return a;
  }
);

// volver a renderizar
aplicarFiltro();

modal.remove();

        } else {

          if (window.EduQuakUI) {
            window.EduQuakUI.error(
              "Error al reportar",
              data.msg || "Error al reportar"
            );
          } else {
            alert(data.msg || "Error al reportar");
          }
        }

      } catch (error) {

        console.error(error);

        if (window.EduQuakUI) {
          window.EduQuakUI.error(
            "Error",
            "Error al enviar reporte"
          );
        } else {
          alert("Error al enviar reporte");
        }
      }
    }
  );
}

// render asesorias
function renderAsesorias(lista) {

  const contenedor =
    document.getElementById(
      "listaMisAsesorias"
    );

  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {

    contenedor.innerHTML = `
      <div class="empty-state">
        No tienes asesorías.
      </div>
    `;

    return;
  }

  lista.forEach((asesoria) => {

    const room =
      asesoria.room_name || "";

    const tieneVideo =
      (
        asesoria.estado === "aceptada" ||
        asesoria.estado === "finalizada"
      ) &&
      room;

    const card =
      document.createElement("article");

    card.className =
      "asesoria-card";

    card.innerHTML = `

      <div class="card-top">

        <div>

          <h3>
            ${asesoria.nombre_asesor || "Asesor"}
          </h3>

          <span class="tipo-pill">
            ${asesoria.tipo || "individual"}
          </span>

        </div>

        <span class="estado-pill ${estadoClase(asesoria.estado)}">
          ${asesoria.estado || "-"}
        </span>

      </div>

      <p class="info-line">
        <strong>Correo:</strong>
        ${asesoria.correo_asesor || "No disponible"}
      </p>

      <p class="info-line">
        <strong>Fecha:</strong>
        ${asesoria.fecha || "Pendiente"}
      </p>

      <p class="info-line">
        <strong>Hora:</strong>
        ${asesoria.hora || "Pendiente"}
      </p>

      ${
        asesoria.mensaje
          ? `
            <div class="mensaje-box">
              ${asesoria.mensaje}
            </div>
          `
          : ""
      }

      <div class="button-row">

        ${
          tieneVideo
            ? `
              <button
                class="btn primary"
                data-room="${room}" data-video-asesoria="${asesoria.id_asesoria}"
              >
                Entrar a videollamada
              </button>
            `
            : ""
        }

        ${
          asesoria.estado === "aceptada"
            ? `
              <button
                class="btn chat"
                data-chat="${asesoria.id_asesoria}"
              >
                Chat
              </button>
            `
            : ""
        }

        ${
  asesoria.estado === "finalizada"

    ? asesoria.reporte_enviado

      ? `
        <button
          class="btn outline"
          disabled
        >
          Reporte enviado
        </button>
      `

      : `
        <button
          class="btn danger"
          data-reportar="${asesoria.id_asesoria}"
        >
          Reportar
        </button>
      `

    : ""
}

      </div>
    `;

    const btnVideo =
      card.querySelector("[data-room]");

    if (btnVideo) {

      btnVideo.addEventListener(
        "click",
        () => entrarAJitsi(room, asesoria.id_asesoria)
      );
    }

    const btnChat =
      card.querySelector(
        "[data-chat]"
      );

    if (btnChat) {

      btnChat.addEventListener(
        "click",
        () =>
          abrirChat(
            asesoria.id_asesoria
          )
      );
    }

    const btnReportar =
      card.querySelector(
        "[data-reportar]"
      );

    if (btnReportar) {

      btnReportar.addEventListener(
        "click",
        () =>
          abrirModalReporte(
            asesoria.id_asesoria
          )
      );
    }

    contenedor.appendChild(card);
  });

  document.dispatchEvent(new CustomEvent("eduquak:chat-rendered"));
}

// filtro
function aplicarFiltro() {

  if (filtroEstadoActivo === "todas") {

    renderAsesorias(
      asesoriasCache
    );

    return;
  }

  const filtradas =
    asesoriasCache.filter(
      (item) =>
        item.estado === filtroEstadoActivo
    );

  renderAsesorias(filtradas);
}

function cambiarFiltroEstado(estado) {
  filtroEstadoActivo = estado || "todas";

  document
    .querySelectorAll(".tab-estado-btn")
    .forEach((btn) => {
      const activo =
        btn.dataset.estado === filtroEstadoActivo;

      btn.classList.toggle("active", activo);
      btn.setAttribute(
        "aria-selected",
        activo ? "true" : "false"
      );
    });

  aplicarFiltro();
}

// cargar asesorias
async function cargarMisAsesorias() {

  try {

    const res = await fetch(
      `${API}/api/asesorias/mis`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await res.json();

    if (!data.ok) {

      document.getElementById(
        "listaMisAsesorias"
      ).innerHTML = `
        <div class="empty-state">
          No se pudieron cargar.
        </div>
      `;

      return;
    }

    asesoriasCache =
      data.asesorias || [];

    aplicarFiltro();

  } catch (error) {

    console.error(error);

    document.getElementById(
      "listaMisAsesorias"
    ).innerHTML = `
      <div class="empty-state">
        Error al cargar asesorías.
      </div>
    `;
  }
}

// filtro listener
document
  .querySelectorAll(".tab-estado-btn")
  .forEach((btn) => {
    btn.addEventListener(
      "click",
      () => cambiarFiltroEstado(btn.dataset.estado)
    );
  });

// init
async function init() {

  const perfil =
    await obtenerMiPerfil();

  if (
    !perfil ||
    perfil.rol !== "alumno"
  ) {

    window.location.href =
      "/pages/login.html";

    return;
  }

  estadoAlumno =
    perfil.estado_validacion || null;

  if (alumnoNoVerificado()) {

    renderBloqueado();

    return;
  }

  cargarMisAsesorias();
}

init();