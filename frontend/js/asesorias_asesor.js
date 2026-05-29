// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let individualesCache = [];
let grupalesCache = [];
let historialCache = [];
let tabActiva = "individuales";

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de ocultar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function ocultarMensaje() {
  const box = document.getElementById("mensajeAsesorias");
  box.textContent = "";
  box.classList.add("hidden");
}

// Se encarga de mostrar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeAsesorias");
  box.textContent = texto;
  box.classList.remove("hidden");
}

// Se encarga de mostrar panel inscritos en esta pantalla y mantiene conectada la vista con el backend.
function mostrarPanelInscritos() {
  document.getElementById("panelInscritos").classList.remove("hidden");
}

// Se encarga de ocultar panel inscritos en esta pantalla y mantiene conectada la vista con el backend.
function ocultarPanelInscritos() {
  document.getElementById("panelInscritos").classList.add("hidden");
  document.getElementById("listaInscritosGrupal").innerHTML = "";
}

// Se encarga de mostrar panel nueva grupal en esta pantalla y mantiene conectada la vista con el backend.
function mostrarPanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.remove("hidden");
}

// Se encarga de ocultar panel nueva grupal en esta pantalla y mantiene conectada la vista con el backend.
function ocultarPanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.add("hidden");
  document.getElementById("formNuevaGrupal").reset();
}

// Se encarga de toggle panel nueva grupal en esta pantalla y mantiene conectada la vista con el backend.
function togglePanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.toggle("hidden");
}

// Se encarga de generar grid cupos en esta pantalla y mantiene conectada la vista con el backend.
function generarGridCupos(inscritos, cupoMaximo) {
  let html = "";

  for (let i = 0; i < cupoMaximo; i++) {
    const ocupado = i < inscritos;
    html += `
      <div class="cupo ${ocupado ? "ocupado" : "libre"}">${i + 1}</div>
    `;
  }

  return html;
}

// Se encarga de obtener timestamp orden en esta pantalla y mantiene conectada la vista con el backend.
function obtenerTimestampOrden(item) {
  const fecha = String(item?.fecha || "").trim();
  const hora = String(item?.hora || "").trim();

  if (!fecha || fecha.toLowerCase() === "pendiente") {
    return Number.POSITIVE_INFINITY;
  }

  const horaNormalizada =
    hora && hora.toLowerCase() !== "pendiente" ? hora : "23:59";

  const fechaHora = new Date(`${fecha}T${horaNormalizada}`);

  if (Number.isNaN(fechaHora.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return fechaHora.getTime();
}

// Se encarga de ordenar por proximidad en esta pantalla y mantiene conectada la vista con el backend.
function ordenarPorProximidad(lista) {
  return [...lista].sort((a, b) => {
    const timeA = obtenerTimestampOrden(a);
    const timeB = obtenerTimestampOrden(b);

    if (timeA === timeB) {
      return 0;
    }

    return timeA - timeB;
  });
}

// Se encarga de cambiar tab en esta pantalla y mantiene conectada la vista con el backend.
function cambiarTab(tab) {
  tabActiva = tab;

  const btnIndividuales = document.getElementById("tabBtnIndividuales");
  const btnGrupales = document.getElementById("tabBtnGrupales");
  const btnHistorial = document.getElementById("tabBtnHistorial");

  const panelIndividuales = document.getElementById("panelTabIndividuales");
  const panelGrupales = document.getElementById("panelTabGrupales");
  const panelHistorial = document.getElementById("panelTabHistorial");

  btnIndividuales.classList.toggle("active", tab === "individuales");
  btnGrupales.classList.toggle("active", tab === "grupales");
  btnHistorial.classList.toggle("active", tab === "historial");

  btnIndividuales.setAttribute("aria-selected", tab === "individuales" ? "true" : "false");
  btnGrupales.setAttribute("aria-selected", tab === "grupales" ? "true" : "false");
  btnHistorial.setAttribute("aria-selected", tab === "historial" ? "true" : "false");

  panelIndividuales.classList.toggle("hidden", tab !== "individuales");
  panelIndividuales.classList.toggle("active", tab === "individuales");

  panelGrupales.classList.toggle("hidden", tab !== "grupales");
  panelGrupales.classList.toggle("active", tab === "grupales");

  panelHistorial.classList.toggle("hidden", tab !== "historial");
  panelHistorial.classList.toggle("active", tab === "historial");

  if (tab !== "grupales") {
    ocultarPanelInscritos();
  }
}

// Se encarga de mostrar individuales en esta pantalla y mantiene conectada la vista con el backend.
function renderIndividuales(lista) {
  const contenedor = document.getElementById("listaIndividuales");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay asesorías individuales aceptadas para mostrar.
      </div>
    `;
    return;
  }

  lista.forEach((item) => {
    const card = document.createElement("article");
    card.className = "asesoria-card";

    const room = item.room_name || "";
    const tieneVideo = item.estado === "aceptada" && room;

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${item.nombre_alumno || "Alumno"}</h3>
          <span class="tipo-pill">Individual</span>
        </div>
        <span class="estado-pill ${item.estado}">${item.estado || "-"}</span>
      </div>

      <p class="info-line"><strong>Correo:</strong> ${item.correo_alumno || "No disponible"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${item.fecha || "Pendiente"}</p>
      <p class="info-line"><strong>Hora:</strong> ${item.hora || "Pendiente"}</p>

      ${
        item.mensaje
          ? `<div class="mensaje-card-box">${item.mensaje}</div>`
          : ""
      }

      <div class="button-row">
        ${
          tieneVideo
            ? `<button class="btn primary" data-room="${room}" data-video-asesoria="${item.id_asesoria}">Entrar a videollamada</button>`
            : ""
        }

        ${
          item.estado === "aceptada"
            ? `<button class="btn chat" data-chat="${item.id_asesoria}">Chat</button>`
            : ""
        }

        ${
          item.estado === "aceptada"
            ? `<button class="btn outline" data-finalizar="${item.id_asesoria}">Finalizar</button>`
            : ""
        }
      </div>
    `;

    const btnVideo = card.querySelector("[data-room]");
    if (btnVideo) {
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      btnVideo.addEventListener("click", () => {
        entrarAJitsi(room, item.id_asesoria);
      });
    }

    const btnChat = card.querySelector("[data-chat]");
    if (btnChat) {
      btnChat.addEventListener("click", () => {
        abrirChat(item.id_asesoria);
      });
    }

    const btnFinalizar = card.querySelector("[data-finalizar]");
    if (btnFinalizar) {
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      btnFinalizar.addEventListener("click", () => {
        finalizarAsesoria(item.id_asesoria);
      });
    }

    contenedor.appendChild(card);
  });

  document.dispatchEvent(new CustomEvent("eduquak:chat-rendered"));
}

// Se encarga de mostrar grupales en esta pantalla y mantiene conectada la vista con el backend.
function renderGrupales(lista) {
  const contenedor = document.getElementById("listaGrupalesAsesor");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no tienes asesorías grupales activas.
      </div>
    `;
    return;
  }

  lista.forEach((item) => {
    const inscritos = Number(item.inscritos || 0);
    const cupoMaximo = Number(item.cupo_maximo || 0);
    const disponibles = Number(item.disponibles || 0);
    const room = item.room_name || "";

    const card = document.createElement("article");
    card.className = "asesoria-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>Sesión grupal</h3>
          <span class="tipo-pill">Grupal</span>
        </div>
        <span class="estado-pill ${item.estado}">${item.estado || "-"}</span>
      </div>

      <p class="info-line"><strong>Fecha:</strong> ${item.fecha || "Pendiente"}</p>
      <p class="info-line"><strong>Hora:</strong> ${item.hora || "Pendiente"}</p>

      ${
        item.mensaje
          ? `<div class="mensaje-card-box">${item.mensaje}</div>`
          : ""
      }

      <div class="cupos-box">
        <p>Cupos: ${inscritos}/${cupoMaximo} · Disponibles: ${disponibles}</p>
        <div class="cupos-grid">
          ${generarGridCupos(inscritos, cupoMaximo)}
        </div>
      </div>

      <div class="button-row">
        <button class="btn outline" data-inscritos="${item.id_asesoria}">
          Ver inscritos
        </button>

        ${
          item.estado === "aceptada"
            ? `<button class="btn chat" data-chat="${item.id_asesoria}">Chat</button>`
            : ""
        }

        ${
          room
            ? `<button class="btn dark" data-room="${room}" data-video-asesoria="${item.id_asesoria}">Entrar a videollamada</button>`
            : ""
        }

        ${
          item.estado === "aceptada"
            ? `<button class="btn outline" data-finalizar="${item.id_asesoria}">Finalizar</button>`
            : ""
        }
      </div>
    `;

    const btnInscritos = card.querySelector("[data-inscritos]");
    // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
    btnInscritos.addEventListener("click", () => {
      cambiarTab("grupales");
      cargarInscritosDeGrupal(item.id_asesoria);
    });

    const btnChat = card.querySelector("[data-chat]");
    if (btnChat) {
      btnChat.addEventListener("click", () => {
        abrirChat(item.id_asesoria);
      });
    }

    const btnVideo = card.querySelector("[data-room]");
    if (btnVideo) {
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      btnVideo.addEventListener("click", () => {
        entrarAJitsi(room, item.id_asesoria);
      });
    }

    const btnFinalizar = card.querySelector("[data-finalizar]");
    if (btnFinalizar) {
      btnFinalizar.addEventListener("click", () => {
        finalizarAsesoria(item.id_asesoria);
      });
    }

    contenedor.appendChild(card);
  });

  document.dispatchEvent(new CustomEvent("eduquak:chat-rendered"));
}

// Se encarga de mostrar historial en esta pantalla y mantiene conectada la vista con el backend.
function renderHistorial(lista) {
  const contenedor = document.getElementById("listaHistorial");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no hay asesorías finalizadas en el historial.
      </div>
    `;
    return;
  }

  lista.forEach((item) => {
    const esGrupal = item.tipo === "grupal";

    const card = document.createElement("article");
    card.className = "asesoria-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${esGrupal ? "Sesión grupal finalizada" : (item.nombre_alumno || "Alumno")}</h3>
          <span class="tipo-pill">${esGrupal ? "Grupal" : "Individual"}</span>
        </div>
        <span class="estado-pill finalizada">finalizada</span>
      </div>

      ${
        !esGrupal
          ? `<p class="info-line"><strong>Correo:</strong> ${item.correo_alumno || "No disponible"}</p>`
          : ""
      }

      <p class="info-line"><strong>Fecha:</strong> ${item.fecha || "Pendiente"}</p>
      <p class="info-line"><strong>Hora:</strong> ${item.hora || "Pendiente"}</p>

      ${
        item.mensaje
          ? `<div class="mensaje-card-box">${item.mensaje}</div>`
          : ""
      }
    `;

    contenedor.appendChild(card);
  });

  document.dispatchEvent(new CustomEvent("eduquak:chat-rendered"));
}

// Se encarga de cargar individuales en esta pantalla y mantiene conectada la vista con el backend.
async function cargarIndividuales() {
  try {
    const res = await fetch(`${API}/api/asesorias`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Individuales asesor:", data);

    if (!data.ok) {
      document.getElementById("listaIndividuales").innerHTML = `
        <div class="empty-state">No se pudieron cargar las asesorías individuales.</div>
      `;
      return;
    }

    const solicitudes = data.solicitudes || [];

    individualesCache = ordenarPorProximidad(
      solicitudes.filter((item) =>
        item.tipo === "individual" && item.estado === "aceptada"
      )
    );

    historialCache = ordenarPorProximidad(
      solicitudes.filter((item) =>
        item.tipo === "individual" && item.estado === "finalizada"
      )
    );

    renderIndividuales(individualesCache);
    renderHistorial(historialCache);
  } catch (error) {
    console.error("Error al cargar individuales:", error);
    document.getElementById("listaIndividuales").innerHTML = `
      <div class="empty-state">Error al cargar asesorías individuales.</div>
    `;
  }
}

// Se encarga de cargar grupales en esta pantalla y mantiene conectada la vista con el backend.
async function cargarGrupales() {
  try {
    const res = await fetch(`${API}/api/asesorias/asesor/grupales`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Grupales asesor:", data);

    if (!data.ok) {
      document.getElementById("listaGrupalesAsesor").innerHTML = `
        <div class="empty-state">No se pudieron cargar tus grupales.</div>
      `;
      return;
    }

    const grupales = data.asesorias || [];

    grupalesCache = ordenarPorProximidad(
      grupales.filter((item) => item.estado === "aceptada")
    );

    const historialGrupal = ordenarPorProximidad(
      grupales.filter((item) => item.estado === "finalizada")
    );

    historialCache = ordenarPorProximidad([
      ...historialCache,
      ...historialGrupal
    ]);

    renderGrupales(grupalesCache);
    renderHistorial(historialCache);
  } catch (error) {
    console.error("Error al cargar grupales:", error);
    document.getElementById("listaGrupalesAsesor").innerHTML = `
      <div class="empty-state">Error al cargar tus grupales.</div>
    `;
  }
}

// Se encarga de finalizar asesoria en esta pantalla y mantiene conectada la vista con el backend.
async function finalizarAsesoria(idAsesoria) {
  try {
    const res = await fetch(`${API}/api/asesorias/${idAsesoria}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        estado: "finalizada"
      })
    });

    const data = await res.json();
    console.log("Finalizar asesoría:", data);

    if (data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.toast("success", "Asesoría finalizada correctamente");
      } else {
        mostrarMensaje(data.message || "Asesoría finalizada correctamente");
      }

      await cargarIndividuales();
      await cargarGrupales();
      cambiarTab("historial");
    } else {
      if (window.EduQuakUI) {
        window.EduQuakUI.error("No se pudo finalizar", data.message || "No se pudo finalizar la asesoría.");
      } else {
        mostrarMensaje(data.message || "No se pudo finalizar la asesoría.");
      }
    }
  } catch (error) {
    console.error("Error al finalizar asesoría:", error);
    mostrarMensaje("Error al finalizar la asesoría.");
  }
}

// Se encarga de crear nueva grupal en esta pantalla y mantiene conectada la vista con el backend.
async function crearNuevaGrupal(e) {
  e.preventDefault();

  const fecha = document.getElementById("fechaGrupal").value;
  const hora = document.getElementById("horaGrupal").value;
  const cupo_maximo = document.getElementById("cupoGrupal").value;
  const mensaje = document.getElementById("mensajeGrupal").value.trim();

  if (!fecha || !hora || !cupo_maximo) {
    mostrarMensaje("Completa fecha, hora y cupo máximo.");
    return;
  }

  try {
    const res = await fetch(`${API}/api/asesorias/grupal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fecha,
        hora,
        mensaje,
        cupo_maximo: Number(cupo_maximo)
      })
    });

    const data = await res.json();
    console.log("Crear grupal:", data);

    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      ocultarPanelNuevaGrupal();
      await cargarGrupales();
      cambiarTab("grupales");
    }
  } catch (error) {
    console.error("Error al crear grupal:", error);
    mostrarMensaje("Error al crear la asesoría grupal.");
  }
}

// Se encarga de cargar inscritos de grupal en esta pantalla y mantiene conectada la vista con el backend.
async function cargarInscritosDeGrupal(idAsesoria) {
  try {
    const res = await fetch(`${API}/api/asesorias/asesor/grupales/${idAsesoria}/inscritos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Inscritos grupal asesor:", data);

    const contenedor = document.getElementById("listaInscritosGrupal");
    contenedor.innerHTML = "";
    mostrarPanelInscritos();

    if (!data.ok) {
      contenedor.innerHTML = `
        <div class="empty-state">No se pudieron cargar los inscritos.</div>
      `;
      return;
    }

    if (!data.inscritos || data.inscritos.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">Esta asesoría grupal aún no tiene inscritos.</div>
      `;
      return;
    }

    data.inscritos.forEach((alumno) => {
      const card = document.createElement("article");
      card.className = "inscrito-card";

      card.innerHTML = `
        <h3>${alumno.nombre || "Alumno"}</h3>
        <p class="info-line"><strong>Correo:</strong> ${alumno.correo || "No disponible"}</p>
        <p class="info-line"><strong>ID:</strong> ${alumno.id_usuario || "-"}</p>
        <p class="info-line"><strong>Inscripción:</strong> ${alumno.fecha_inscripcion || "-"}</p>
      `;

      contenedor.appendChild(card);
    });

    document.getElementById("panelInscritos").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Error al cargar inscritos:", error);
    const contenedor = document.getElementById("listaInscritosGrupal");
    contenedor.innerHTML = `
      <div class="empty-state">Error al cargar los inscritos.</div>
    `;
    mostrarPanelInscritos();
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

// Se encarga de entrar a Jitsi validando horario y pertenencia.
async function entrarAJitsi(room, idAsesoria) {
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
    const nombre = user.nombre || "Asesor";
    const sala = data.room_name || room;

    window.open(
      `/pages/videollamada.html?id=${encodeURIComponent(idAsesoria)}&room=${encodeURIComponent(sala)}&name=${encodeURIComponent(nombre)}&role=asesor`,
      "_blank"
    );
  } catch (error) {
    console.error("Error al validar videollamada:", error);
    mostrarAlertaVideo("No se pudo validar la videollamada. Intenta de nuevo.");
  }
}

// Se encarga de abrir chat de una asesoría aceptada en modal.
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

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("btnToggleNuevaGrupal").addEventListener("click", togglePanelNuevaGrupal);
// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("btnCancelarNuevaGrupal").addEventListener("click", ocultarPanelNuevaGrupal);
// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formNuevaGrupal").addEventListener("submit", crearNuevaGrupal);

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("tabBtnIndividuales").addEventListener("click", () => {
  cambiarTab("individuales");
});

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("tabBtnGrupales").addEventListener("click", () => {
  cambiarTab("grupales");
});

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("tabBtnHistorial").addEventListener("click", () => {
  cambiarTab("historial");
});

ocultarMensaje();
ocultarPanelInscritos();
ocultarPanelNuevaGrupal();
cambiarTab("individuales");
cargarIndividuales();
cargarGrupales();