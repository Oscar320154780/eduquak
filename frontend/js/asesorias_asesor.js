const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let individualesCache = [];
let grupalesCache = [];
let historialCache = [];
let tabActiva = "individuales";

if (!token) {
  window.location.href = "/pages/login.html";
}

function ocultarMensaje() {
  const box = document.getElementById("mensajeAsesorias");
  box.textContent = "";
  box.classList.add("hidden");
}

function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeAsesorias");
  box.textContent = texto;
  box.classList.remove("hidden");
}

function mostrarPanelInscritos() {
  document.getElementById("panelInscritos").classList.remove("hidden");
}

function ocultarPanelInscritos() {
  document.getElementById("panelInscritos").classList.add("hidden");
  document.getElementById("listaInscritosGrupal").innerHTML = "";
}


function formatearDinero(valor) {
  const monto = Number(valor || 0);
  return monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function formatearFechaCorta(valor) {
  if (!valor || String(valor).toLowerCase() === "pendiente") {
    return "Pendiente";
  }

  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function renderAvisoReagenda(item) {
  const reagendada = item.reagendada === true || item.reagendada === 1 || item.reagendada === "1" || item.reagendada === "true";

  if (!reagendada) return "";

  return `
    <div class="reagenda-alert">
      <strong>Asesoría reagendada</strong>
      <span>Antes: ${formatearFechaCorta(item.fecha_anterior)} · ${item.hora_anterior || "Pendiente"}</span>
      <span>Ahora: ${formatearFechaCorta(item.fecha)} · ${item.hora || "Pendiente"}</span>
      ${item.motivo_reagenda ? `<p>${item.motivo_reagenda}</p>` : ""}
    </div>
  `;
}

function mostrarPanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.remove("hidden");
}

function ocultarPanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.add("hidden");
  document.getElementById("formNuevaGrupal").reset();
}

function togglePanelNuevaGrupal() {
  document.getElementById("panelNuevaGrupal").classList.toggle("hidden");
}

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
          <h3>${item.nombre_alumno || "Alumno"} <span class="role-badge role-alumno inline">Alumno</span></h3>
          <span class="tipo-pill">Individual</span>
        </div>
        <span class="estado-pill ${item.estado}">${item.estado || "-"}</span>
      </div>

      <p class="info-line"><strong>Correo:</strong> ${item.correo_alumno || "No disponible"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(item.fecha)}</p>
      <p class="info-line"><strong>Hora:</strong> ${item.hora || "Pendiente"}</p>
      <p class="info-line"><strong>Precio:</strong> ${formatearDinero(item.precio || 100)}</p>
      <p class="info-line"><strong>Estado de pago:</strong> ${item.estado_pago || "sin_pago"}</p>

      ${renderAvisoReagenda(item)}

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
            ? `<button class="btn warning" data-reagendar="${item.id_asesoria}">Reagendar</button>`
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

    const btnReagendar = card.querySelector("[data-reagendar]");
    if (btnReagendar) {
      btnReagendar.addEventListener("click", () => {
        abrirModalReagendar(item);
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

      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(item.fecha)}</p>
      <p class="info-line"><strong>Hora:</strong> ${item.hora || "Pendiente"}</p>
      <p class="info-line"><strong>Precio:</strong> ${formatearDinero(item.precio || 100)}</p>
      <p class="info-line"><strong>Estado de pago:</strong> ${item.estado_pago || "sin_pago"}</p>

      ${renderAvisoReagenda(item)}

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
          item.estado === "aceptada"
            ? `<button class="btn warning" data-reagendar="${item.id_asesoria}">Reagendar</button>`
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

    const btnReagendar = card.querySelector("[data-reagendar]");
    if (btnReagendar) {
      btnReagendar.addEventListener("click", () => {
        abrirModalReagendar(item);
      });
    }

    const btnVideo = card.querySelector("[data-room]");
    if (btnVideo) {
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
          <h3>
            ${esGrupal ? "Sesión grupal finalizada" : `${item.nombre_alumno || "Alumno"} <span class="role-badge role-alumno inline">Alumno</span>`}
          </h3>
          <span class="tipo-pill">${esGrupal ? "Grupal" : "Individual"}</span>
        </div>
        <span class="estado-pill finalizada">finalizada</span>
      </div>

      ${
        !esGrupal
          ? `<p class="info-line"><strong>Correo:</strong> ${item.correo_alumno || "No disponible"}</p>`
          : ""
      }

      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(item.fecha)}</p>
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

async function abrirModalReagendar(item) {
  if (!window.Swal) {
    mostrarMensaje("No se pudo abrir el formulario de reagenda.");
    return;
  }

  const result = await Swal.fire({
    title: "Reagendar asesoría",
    html: `
      <div class="swal-form-grid">
        <label>Nueva fecha</label>
        <input type="date" id="swalFechaReagenda" class="swal2-input" value="${item.fecha || ""}">
        <label>Nueva hora</label>
        <input type="time" id="swalHoraReagenda" class="swal2-input" value="${item.hora || ""}">
        <label>Motivo o acuerdo</label>
        <textarea id="swalMotivoReagenda" class="swal2-textarea" placeholder="Ej. Se acordó por chat cambiar el horario..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar cambio",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
      const fecha = document.getElementById("swalFechaReagenda")?.value;
      const hora = document.getElementById("swalHoraReagenda")?.value;
      const motivo = document.getElementById("swalMotivoReagenda")?.value.trim();

      if (!fecha || !hora) {
        Swal.showValidationMessage("Selecciona fecha y hora");
        return false;
      }

      return { fecha, hora, motivo };
    }
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${API}/api/asesorias/${item.id_asesoria}/reagendar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(result.value)
    });

    const data = await res.json();

    if (!data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.error("No se pudo reagendar", data.message || "Intenta de nuevo.");
      } else {
        mostrarMensaje(data.message || "No se pudo reagendar.");
      }
      return;
    }

    if (window.EduQuakUI) {
      window.EduQuakUI.toast("success", "Asesoría reagendada correctamente");
    } else {
      mostrarMensaje("Asesoría reagendada correctamente.");
    }

    await cargarIndividuales();
    await cargarGrupales();
  } catch (error) {
    console.error("Error al reagendar:", error);
    mostrarMensaje("Error al reagendar la asesoría.");
  }
}

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

async function crearNuevaGrupal(e) {
  e.preventDefault();

  const fecha = document.getElementById("fechaGrupal").value;
  const hora = document.getElementById("horaGrupal").value;
  const cupo_maximo = document.getElementById("cupoGrupal").value;
  const precio = document.getElementById("precioGrupal").value;
  const mensaje = document.getElementById("mensajeGrupal").value.trim();

  if (!fecha || !hora || !cupo_maximo || !precio) {
    mostrarMensaje("Completa fecha, hora, cupo máximo y precio.");
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
        cupo_maximo: Number(cupo_maximo),
        precio: Number(precio)
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
        <h3>${alumno.nombre || "Alumno"} <span class="role-badge role-alumno inline">Alumno</span></h3>
        <p class="info-line"><strong>Correo:</strong> ${alumno.correo || "No disponible"}</p>
        <p class="info-line"><strong>Inscripción:</strong> ${formatearFechaCorta(alumno.fecha_inscripcion)}</p>
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

document.getElementById("btnToggleNuevaGrupal").addEventListener("click", togglePanelNuevaGrupal);
document.getElementById("btnCancelarNuevaGrupal").addEventListener("click", ocultarPanelNuevaGrupal);
document.getElementById("formNuevaGrupal").addEventListener("submit", crearNuevaGrupal);

document.getElementById("tabBtnIndividuales").addEventListener("click", () => {
  cambiarTab("individuales");
});

document.getElementById("tabBtnGrupales").addEventListener("click", () => {
  cambiarTab("grupales");
});

document.getElementById("tabBtnHistorial").addEventListener("click", () => {
  cambiarTab("historial");
});

ocultarMensaje();
ocultarPanelInscritos();
ocultarPanelNuevaGrupal();
cambiarTab("individuales");
cargarIndividuales();
cargarGrupales();
