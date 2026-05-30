// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let grupalesCache = [];
let estadoAlumno = null;
let paginaActual = 1;
const LIMITE_POR_PAGINA = 12;
let textoBusqueda = "";
let busquedaTimer = null;

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de obtener mi perfil en esta pantalla y mantiene conectada la vista con el backend.
async function obtenerMiPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      return null;
    }

    return data.user || null;
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return null;
  }
}

// Se encarga de alumno no verificado en esta pantalla y mantiene conectada la vista con el backend.
function alumnoNoVerificado() {
  return estadoAlumno !== "verificado";
}

// Se encarga de ocultar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function ocultarMensaje() {
  const box = document.getElementById("mensajeGrupal");
  if (!box) return;

  box.textContent = "";
  box.classList.add("hidden");
}

// Se encarga de mostrar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeGrupal");
  if (!box) return;

  box.textContent = texto;
  box.classList.remove("hidden");
}

// Se encarga de ocultar panel inscritos en esta pantalla y mantiene conectada la vista con el backend.
function ocultarPanelInscritos() {
  const panel = document.getElementById("panelInscritos");
  const contenedor = document.getElementById("resultadoInscritosAlumnoGrupal");
  const resumen = document.getElementById("resumenInscritos");

  if (panel) panel.classList.add("hidden");
  if (contenedor) contenedor.innerHTML = "";
  if (resumen) {
    resumen.textContent = "";
    resumen.classList.add("hidden");
  }
}

// Se encarga de mostrar panel inscritos en esta pantalla y mantiene conectada la vista con el backend.
function mostrarPanelInscritos() {
  document.getElementById("panelInscritos")?.classList.remove("hidden");
}

// Se encarga de generar grid cupos en esta pantalla y mantiene conectada la vista con el backend.
function generarGridCupos(inscritos, cupoMaximo) {
  let html = "";

  for (let i = 0; i < cupoMaximo; i++) {
    const ocupado = i < inscritos;
    html += `
      <div class="cupo ${ocupado ? "ocupado" : "libre"}">
        ${i + 1}
      </div>
    `;
  }

  return html;
}

// Se encarga de mostrar bloqueado en esta pantalla y mantiene conectada la vista con el backend.
function renderBloqueado() {
  const contenedor = document.getElementById("listaGrupales");

  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada por un administrador para ver e inscribirte a asesorías grupales.
    </div>
  `;

  mostrarMensaje("Tu cuenta aún no está verificada. Esta función está deshabilitada.");
  ocultarPanelInscritos();
}

// Se encarga de mostrar grupales en esta pantalla y mantiene conectada la vista con el backend.
function renderGrupales(lista) {
  const contenedor = document.getElementById("listaGrupales");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay asesorías grupales disponibles con esos filtros.
      </div>
    `;
    ocultarMensaje();
    ocultarPanelInscritos();
    return;
  }

  lista.forEach((g) => {
    const room = g.room_name || "";

    const card = document.createElement("article");
    card.className = "grupal-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${g.nombre_asesor} <span class="role-badge role-asesor inline">Asesor</span></h3>
        </div>
        <span class="estado-pill">${g.estado || "aceptada"}</span>
      </div>

      <p class="info-line"><strong>Fecha:</strong> ${g.fecha || "-"}</p>
      <p class="info-line"><strong>Hora:</strong> ${g.hora || "-"}</p>

      ${
        g.mensaje
          ? `<div class="mensaje-box">${g.mensaje}</div>`
          : ""
      }

      <div class="cupos-box">
        <p>Cupos: ${g.inscritos}/${g.cupo_maximo} · Disponibles: ${g.disponibles}</p>
        <div class="cupos-grid">
          ${generarGridCupos(g.inscritos, g.cupo_maximo)}
        </div>
      </div>

      <div class="button-row">

        ${
          g.ya_inscrito
            ? `
              <button class="btn danger" data-salirse="${g.id_asesoria}">
                Salirse
              </button>
            `
            : `
              <button 
                class="btn primary" 
                data-inscribir="${g.id_asesoria}" 
                ${g.disponibles <= 0 ? "disabled" : ""}
              >
                ${g.disponibles <= 0 ? "Sin lugares" : "Inscribirme"}
              </button>
            `
        }

        ${
          g.ya_inscrito && room
            ? `<button class="btn success" data-room="${room}" data-video-asesoria="${g.id_asesoria}">Entrar a videollamada</button>`
            : ""
        }

      </div>
    `;
    const btnInscribir = card.querySelector("[data-inscribir]");

    if (btnInscribir) {
      btnInscribir.addEventListener("click", () => {
        inscribirmeAGrupalDirecto(g.id_asesoria);
      });
    }

    const btnSalirse = card.querySelector("[data-salirse]");

    if (btnSalirse) {
      btnSalirse.addEventListener("click", () => {
        salirseDeGrupal(g.id_asesoria);
      });
    }

    const btnVideo = card.querySelector("[data-room]");

    if (btnVideo) {
      btnVideo.addEventListener("click", () => {
        entrarAJitsiAlumnoDirecto(room, g.id_asesoria);
      });
    }

    contenedor.appendChild(card);
  });
}

function renderPaginacionGrupales(pagination) {
  const paginacion = document.getElementById("paginacionGrupales");
  if (!paginacion) return;

  const total = Number(pagination?.total || 0);
  const page = Number(pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);
  const limit = Number(pagination?.limit || LIMITE_POR_PAGINA);
  const inicio = total === 0 ? 0 : (page - 1) * limit + 1;
  const fin = Math.min(page * limit, total);

  paginacion.classList.remove("hidden");
  paginacion.innerHTML = `
    <p class="pagination-info">Mostrando ${inicio}-${fin} de ${total} asesorías grupales</p>
    <div class="pagination-actions">
      <button class="btn outline" id="grupalesAnterior" ${page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Página ${page} de ${totalPages}</span>
      <button class="btn outline" id="grupalesSiguiente" ${page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;

  document.getElementById("grupalesAnterior")?.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual -= 1;
      cargarGrupales();
    }
  });

  document.getElementById("grupalesSiguiente")?.addEventListener("click", () => {
    if (paginaActual < totalPages) {
      paginaActual += 1;
      cargarGrupales();
    }
  });
}

// Se encarga de cargar grupales en esta pantalla y mantiene conectada la vista con el backend.
async function cargarGrupales() {
  try {
    const params = new URLSearchParams({
      page: String(paginaActual),
      limit: String(LIMITE_POR_PAGINA)
    });

    if (textoBusqueda) params.set("q", textoBusqueda);

    const res = await fetch(`${API}/api/asesorias/grupales?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Grupales:", data);

    if (!data.ok) {
      document.getElementById("listaGrupales").innerHTML = `
        <div class="empty-state">No se pudieron cargar las asesorías grupales.</div>
      `;
      document.getElementById("paginacionGrupales")?.classList.add("hidden");
      ocultarMensaje();
      ocultarPanelInscritos();
      return;
    }

    grupalesCache = data.asesorias || [];
    renderGrupales(grupalesCache);
    renderPaginacionGrupales(data.pagination || { page: paginaActual, limit: LIMITE_POR_PAGINA, total: 0, totalPages: 1 });
  } catch (error) {
    console.error("Error al ver grupales:", error);

    document.getElementById("listaGrupales").innerHTML = `
      <div class="empty-state">Error al cargar las asesorías grupales.</div>
    `;
    document.getElementById("paginacionGrupales")?.classList.add("hidden");

    ocultarMensaje();
    ocultarPanelInscritos();
  }
}

// Se encarga de inscribirme agrupal directo en esta pantalla y mantiene conectada la vista con el backend.
async function inscribirmeAGrupalDirecto(id) {

  if (alumnoNoVerificado()) {
    mostrarMensaje("Tu cuenta debe estar verificada para inscribirte a grupales.");
    return;
  }

  try {

    const res = await fetch(
      `${API}/api/asesorias/grupales/${id}/inscribirse`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    console.log("Inscripción grupal:", data);

    // Feedback visual manejado con toast moderno.

    if (data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.toast("success", "Te inscribiste a la asesoría grupal");
      }
      await cargarGrupales();
    }

  } catch (error) {

    console.error("Error al inscribirse a grupal:", error);

    if (window.EduQuakUI) {
      window.EduQuakUI.error("Error", "Error al inscribirse a la asesoría grupal.");
    }
  }
}

// alumno se sale de una grupal
async function salirseDeGrupal(id) {

  const confirmar = window.EduQuakUI
    ? await window.EduQuakUI.confirm({
        title: "¿Salir de la grupal?",
        text: "¿Seguro que quieres salirte de esta asesoría grupal?",
        confirmText: "Sí, salir",
        cancelText: "Cancelar",
        icon: "question",
        confirmButtonColor: "#dc2626"
      })
    : confirm(
        "¿Seguro que quieres salirte de esta asesoría grupal?"
      );

  if (!confirmar) return;

  try {

    const res = await fetch(
      `${API}/api/asesorias/grupales/${id}/salirse`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    console.log("Salir de grupal:", data);

    // Feedback visual manejado con toast moderno.

    if (data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.toast("success", "Saliste de la asesoría grupal");
      }
      await cargarGrupales();
    }

  } catch (error) {

    console.error("Error al salir de grupal:", error);

    if (window.EduQuakUI) {
      window.EduQuakUI.error("Error", "Error al salir de la asesoría grupal.");
    }

  }
}

// Se encarga de ver inscritos grupal alumno en esta pantalla y mantiene conectada la vista con el backend.
async function verInscritosGrupalAlumno(idAsesoria) {
  if (alumnoNoVerificado()) {
    mostrarMensaje("Tu cuenta debe estar verificada para ver esta información.");
    return;
  }

  try {
    const res = await fetch(`${API}/api/asesorias/grupales/${idAsesoria}/inscritos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    console.log("Inscritos grupal alumno:", data);

    const contenedor = document.getElementById("resultadoInscritosAlumnoGrupal");
    const resumen = document.getElementById("resumenInscritos");

    contenedor.innerHTML = "";
    mostrarPanelInscritos();

    if (!data.ok) {

      resumen?.classList.add("hidden");

      contenedor.innerHTML = `
        <div class="empty-state">
          ${data.message || "No se pudieron cargar los inscritos."}
        </div>
      `;

      return;
    }

    if (!data.inscritos || data.inscritos.length === 0) {

      if (resumen) {
        resumen.classList.remove("hidden");
        resumen.textContent = "0 inscritos";
      }

      contenedor.innerHTML = `
        <div class="empty-state">
          Esta asesoría grupal aún no tiene alumnos inscritos.
        </div>
      `;

      return;
    }

    if (resumen) {
      resumen.classList.remove("hidden");
      resumen.textContent = `${data.inscritos.length} inscrito${data.inscritos.length === 1 ? "" : "s"}`;
    }

    data.inscritos.forEach((alumno) => {

      const card = document.createElement("article");
      card.className = "inscrito-card";

      card.innerHTML = `
        <h3>${alumno.nombre || "Alumno"} <span class="role-badge role-alumno inline">Alumno</span></h3>
        <p class="info-line"><strong>Correo:</strong> ${alumno.correo || "No disponible"}</p>
        <p class="info-line"><strong>ID:</strong> ${alumno.id_usuario || "-"}</p>
        <p class="info-line"><strong>Inscripción:</strong> ${alumno.fecha_inscripcion || "-"}</p>
      `;

      contenedor.appendChild(card);

    });

    document.getElementById("panelInscritos")?.scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    console.error("Error al ver inscritos de grupal:", error);

    const contenedor = document.getElementById("resultadoInscritosAlumnoGrupal");
    const resumen = document.getElementById("resumenInscritos");

    mostrarPanelInscritos();
    resumen?.classList.add("hidden");

    if (contenedor) {
      contenedor.innerHTML = `
        <div class="empty-state">
          Error al cargar los inscritos.
        </div>
      `;
    }

  }
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

// Se encarga de entrar a Jitsi alumno directo validando horario y pertenencia.
async function entrarAJitsiAlumnoDirecto(room, idAsesoria) {

  if (!idAsesoria) {
    mostrarAlertaVideo("No se pudo validar esta asesoría. Intenta recargar la página.");
    return;
  }

  try {
    const res = await fetch(`${API}/api/asesorias/${idAsesoria}/video-access`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!data.ok) {
      mostrarAlertaVideo(
        data.message ||
        "La videollamada estará disponible 10 minutos antes de la hora agendada."
      );
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const nombre = user.nombre || "Alumno";
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

document.getElementById("busquedaGrupal")?.addEventListener("input", (e) => {
  if (alumnoNoVerificado()) return;

  textoBusqueda = e.target.value.trim();
  paginaActual = 1;

  clearTimeout(busquedaTimer);
  busquedaTimer = setTimeout(() => {
    cargarGrupales();
  }, 300);
});

// Se encarga de init en esta pantalla y mantiene conectada la vista con el backend.
async function init() {

  ocultarMensaje();
  ocultarPanelInscritos();

  const perfil = await obtenerMiPerfil();

  if (!perfil || perfil.rol !== "alumno") {
    window.location.href = "/pages/login.html";
    return;
  }

  estadoAlumno = perfil.estado_validacion || null;

  if (alumnoNoVerificado()) {
    renderBloqueado();
    return;
  }

  cargarGrupales();
}

init();