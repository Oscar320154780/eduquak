// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let solicitudesCache = [];

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de ocultar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function ocultarMensaje() {
  const box = document.getElementById("mensajeSolicitud");
  box.textContent = "";
  box.classList.add("hidden");
}

// Se encarga de mostrar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeSolicitud");
  box.textContent = texto;
  box.classList.remove("hidden");
}

// Se encarga de normalizar estado en esta pantalla y mantiene conectada la vista con el backend.
function normalizarEstado(estado) {
  return (estado || "").toLowerCase();
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

    if (timeA === timeB) return 0;
    return timeA - timeB;
  });
}

// Se encarga de mostrar solicitudes en esta pantalla y mantiene conectada la vista con el backend.
function renderSolicitudes(lista) {
  const contenedor = document.getElementById("listaSolicitudes");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No tienes solicitudes pendientes por revisar.
      </div>
    `;
    return;
  }

  lista.forEach((solicitud) => {
    const estado = normalizarEstado(solicitud.estado);
    const tipo = solicitud.tipo || "individual";

    const card = document.createElement("article");
    card.className = "solicitud-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${solicitud.nombre_alumno || "Alumno"}</h3>
          <span class="tipo-pill">${tipo === "grupal" ? "Grupal" : "Individual"}</span>
        </div>
        <span class="estado-pill ${estado}">${solicitud.estado || "-"}</span>
      </div>

      <p class="info-line"><strong>Correo:</strong> ${solicitud.correo_alumno || "No disponible"}</p>
      <p class="info-line"><strong>Fecha asignada:</strong> ${solicitud.fecha || "Pendiente"}</p>
      <p class="info-line"><strong>Hora asignada:</strong> ${solicitud.hora || "Pendiente"}</p>

      ${
        solicitud.mensaje
          ? `
            <div class="mensaje-box">
              ${solicitud.mensaje}
            </div>
          `
          : ""
      }

      <div class="agenda-box">
        <div class="input-group">
          <label for="fecha-${solicitud.id_asesoria}">Fecha</label>
          <input type="date" id="fecha-${solicitud.id_asesoria}">
        </div>

        <div class="input-group">
          <label for="hora-${solicitud.id_asesoria}">Hora</label>
          <input type="time" id="hora-${solicitud.id_asesoria}">
        </div>
      </div>

      <div class="button-row">
        <button class="btn success" data-aceptar="${solicitud.id_asesoria}">Aceptar</button>
        <button class="btn danger" data-rechazar="${solicitud.id_asesoria}">Rechazar</button>
      </div>
    `;

    const btnAceptar = card.querySelector("[data-aceptar]");
    if (btnAceptar) {
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      btnAceptar.addEventListener("click", () => aceptarSolicitud(solicitud.id_asesoria));
    }

    const btnRechazar = card.querySelector("[data-rechazar]");
    if (btnRechazar) {
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      btnRechazar.addEventListener("click", () => actualizarEstadoSolicitud(solicitud.id_asesoria, "rechazada"));
    }

    contenedor.appendChild(card);
  });
}

// Se encarga de cargar solicitudes en esta pantalla y mantiene conectada la vista con el backend.
async function cargarSolicitudes() {
  try {
    const res = await fetch(`${API}/api/asesorias`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Solicitudes:", data);

    if (!data.ok) {
      document.getElementById("listaSolicitudes").innerHTML = `
        <div class="empty-state">No se pudieron cargar las solicitudes.</div>
      `;
      ocultarMensaje();
      return;
    }

    solicitudesCache = ordenarPorProximidad(
      (data.solicitudes || []).filter((s) => normalizarEstado(s.estado) === "pendiente")
    );

    renderSolicitudes(solicitudesCache);
  } catch (error) {
    console.error("Error al cargar solicitudes:", error);
    document.getElementById("listaSolicitudes").innerHTML = `
      <div class="empty-state">Error al cargar solicitudes.</div>
    `;
    ocultarMensaje();
  }
}

// Se encarga de aceptar solicitud en esta pantalla y mantiene conectada la vista con el backend.
async function aceptarSolicitud(idAsesoria) {
  const fecha = document.getElementById(`fecha-${idAsesoria}`)?.value;
  const hora = document.getElementById(`hora-${idAsesoria}`)?.value;

  if (!fecha || !hora) {
    if (window.EduQuakUI) {
      window.EduQuakUI.warning(
        "Fecha y hora requeridas",
        "Selecciona fecha y hora antes de aceptar la asesoría."
      );
    } else {
      mostrarMensaje("Selecciona fecha y hora antes de aceptar la asesoría.");
    }
    return;
  }

  try {
    const res = await fetch(`${API}/api/asesorias/${idAsesoria}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        estado: "aceptada",
        fecha,
        hora
      })
    });

    const data = await res.json();

    if (data.ok) {
      ocultarMensaje();

      if (window.EduQuakUI) {
        window.EduQuakUI.toast(
          "success",
          "Asesoría aceptada correctamente"
        );
      } else {
        mostrarMensaje("Asesoría aceptada correctamente.");
      }

      await cargarSolicitudes();
    } else {
      if (window.EduQuakUI) {
        window.EduQuakUI.error(
          "No se pudo aceptar",
          data.message || "No se pudo aceptar la asesoría."
        );
      } else {
        mostrarMensaje(data.message || "No se pudo aceptar la asesoría.");
      }
    }
  } catch (error) {
    console.error("Error al aceptar solicitud:", error);

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Error",
        "Error al aceptar la asesoría."
      );
    } else {
      mostrarMensaje("Error al aceptar la asesoría.");
    }
  }
}

// Se encarga de actualizar estado solicitud en esta pantalla y mantiene conectada la vista con el backend.
async function actualizarEstadoSolicitud(idAsesoria, estado) {
  try {
    const res = await fetch(`${API}/api/asesorias/${idAsesoria}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ estado })
    });

    const data = await res.json();
    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      await cargarSolicitudes();
    }
  } catch (error) {
    console.error("Error al actualizar asesoría:", error);
    mostrarMensaje("Error al actualizar la asesoría.");
  }
}

ocultarMensaje();
cargarSolicitudes();