const API = window.EDUQUAK_API_URL || "";

const token = localStorage.getItem("token");

let asesoriasCache = [];

let estadoAlumno = null;

let filtroEstadoActivo = "todas";

if (!token) {
  window.location.href = "/pages/login.html";
}

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

function alumnoNoVerificado() {
  return estadoAlumno !== "verificado";
}

function renderBloqueado(perfil = {}) {

  const contenedor =
    document.getElementById(
      "listaMisAsesorias"
    );

  const mensaje = perfil.sancion_activa
    ? `Tu cuenta está sancionada temporalmente. Motivo: ${escaparHTML(perfil.sancion?.motivo || "Incumplimiento de normas")}`
    : "Tu cuenta debe estar verificada para usar asesorías.";

  contenedor.innerHTML = `
    <div class="empty-state">
      ${mensaje}
    </div>
  `;

  document
    .querySelectorAll(".tab-estado-btn")
    .forEach((btn) => {
      btn.disabled = true;
    });
}

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


function formatearDinero(valor) {
  const monto = Number(valor || 0);
  return monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function estadoPagoTexto(valor) {
  const estado = String(valor || "sin_pago").toLowerCase();

  if (estado === "pagado" || estado === "aprobado") return "Pagada";
  if (estado === "pendiente") return "Pago pendiente";
  if (estado === "fallido" || estado === "rechazado") return "Pago rechazado";
  return "Sin pago";
}

function pagoAprobado(asesoria) {
  const estado = String(asesoria.estado_pago || "").toLowerCase();
  return estado === "pagado" || estado === "aprobado";
}

function renderResumenPago(asesoria) {
  if (asesoria.estado !== "aceptada") return "";

  const precio = Number(asesoria.precio || asesoria.monto_total || 100);
  const clase = pagoAprobado(asesoria) ? "pagado" : "pendiente";

  return `
    <div class="pago-card ${clase}">
      <div>
        <strong>${estadoPagoTexto(asesoria.estado_pago)}</strong>
        <span>Precio de asesoría: ${formatearDinero(precio)}</span>
      </div>
      ${
        pagoAprobado(asesoria)
          ? `<span class="pago-pill pagado">Acceso liberado</span>`
          : `<span class="pago-pill pendiente">Requiere pago</span>`
      }
    </div>
  `;
}

async function iniciarPagoAsesoria(idAsesoria, boton) {
  try {
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Preparando pago...";
    }

    const res = await fetch(`${API}/api/pagos/asesoria/${idAsesoria}/preferencia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.message || data.error || "No se pudo iniciar el pago");
    }

    if (data.yaPagado) {
      if (window.EduQuakUI) window.EduQuakUI.toast("success", data.message || "Asesoría pagada");
      await cargarMisAsesorias();
      return;
    }

    const urlPago = data.paymentUrl || data.initPoint || data.sandboxInitPoint;

    if (!urlPago) {
      throw new Error("Mercado Pago no devolvió enlace de pago");
    }

    window.location.href = urlPago;
  } catch (error) {
    console.error("Error al iniciar pago:", error);

    if (window.EduQuakUI) {
      window.EduQuakUI.error("Pago no disponible", error.message || "No se pudo iniciar el pago");
    } else {
      alert(error.message || "No se pudo iniciar el pago");
    }
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = "Pagar asesoría";
    }
  }
}

function normalizarReporteEnviado(valor) {
  return valor === true ||
    valor === 1 ||
    valor === "1" ||
    valor === "true";
}


function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function formatearFechaReporte(valor) {
  if (!valor) {
    return "Fecha no disponible";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function renderAvisoReagenda(asesoria) {
  const reagendada = asesoria.reagendada === true || asesoria.reagendada === 1 || asesoria.reagendada === "1" || asesoria.reagendada === "true";

  if (!reagendada) return "";

  return `
    <div class="reagenda-alert alumno">
      <strong>Tu asesoría fue reagendada</strong>
      <span>Antes: ${formatearFechaCorta(asesoria.fecha_anterior)} · ${asesoria.hora_anterior || "Pendiente"}</span>
      <span>Ahora: ${formatearFechaCorta(asesoria.fecha)} · ${asesoria.hora || "Pendiente"}</span>
      ${asesoria.motivo_reagenda ? `<p>${escaparHTML(asesoria.motivo_reagenda)}</p>` : ""}
    </div>
  `;
}

function estadoReporteNormalizado(valor) {
  return String(valor || "pendiente").toLowerCase();
}

function claseTimelineReporte(estado, paso) {
  const orden = {
    pendiente: 1,
    revisado: 2,
    resuelto: 3
  };

  const actual = orden[estadoReporteNormalizado(estado)] || 1;

  return actual >= paso ? "activo" : "";
}

async function abrirDetalleReporte(idAsesoria) {
  const existente = document.getElementById("modalReporteDetalle");

  if (existente) {
    existente.remove();
  }

  try {
    const res = await fetch(
      `${API}/api/asesorias/${idAsesoria}/reporte`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.error(
          "Reporte no disponible",
          data.msg || "No se pudo cargar el detalle del reporte"
        );
      } else {
        alert(data.msg || "No se pudo cargar el detalle del reporte");
      }

      return;
    }

    const reporte = data.reporte || {};
    const estado = estadoReporteNormalizado(reporte.estado);

    const modal = document.createElement("div");
    modal.id = "modalReporteDetalle";
    modal.className = "modal-reporte";

    modal.innerHTML = `
      <div class="modal-content modal-detalle-reporte">
        <div class="detalle-reporte-header">
          <div>
            <span class="badge-reporte-detalle">Reporte enviado</span>
            <h2>${escaparHTML(reporte.motivo || "Detalle del reporte")}</h2>
            <p>
              ${escaparHTML(reporte.nombre_alumno || "Alumno")}
              ·
              ${escaparHTML(reporte.nombre_asesor || "Asesor")}
            </p>
          </div>

          <button
            type="button"
            class="btn-cerrar-detalle-reporte"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div class="detalle-reporte-grid">
          <div>
            <strong>Fecha asesoría</strong>
            <span>${escaparHTML(reporte.fecha_asesoria || "No disponible")}</span>
          </div>

          <div>
            <strong>Hora</strong>
            <span>${escaparHTML(reporte.hora_asesoria || "No disponible")}</span>
          </div>
        </div>

        <div class="reporte-timeline">
          <div class="timeline-item ${claseTimelineReporte(estado, 1)}">
            <span class="timeline-dot"></span>
            <div>
              <strong>Reporte creado</strong>
              <p>${formatearFechaReporte(reporte.fecha_reporte)}</p>
            </div>
          </div>

          <div class="timeline-item ${claseTimelineReporte(estado, 2)}">
            <span class="timeline-dot"></span>
            <div>
              <strong>Revisado</strong>
              <p>${estado === "pendiente" ? "Pendiente de revisión" : "El administrador ya lo revisó"}</p>
            </div>
          </div>

          <div class="timeline-item ${claseTimelineReporte(estado, 3)}">
            <span class="timeline-dot"></span>
            <div>
              <strong>Resuelto</strong>
              <p>${estado === "resuelto" ? "El reporte fue marcado como resuelto" : "Aún no se ha resuelto"}</p>
            </div>
          </div>
        </div>

        <div class="detalle-reporte-box">
          <h3>Descripción</h3>
          <p>${escaparHTML(reporte.descripcion || "Sin descripción")}</p>
        </div>

        ${
          reporte.evidencia_url
            ? `
              <div class="modal-actions detalle-actions">
                <a
                  class="btn primary"
                  href="${escaparHTML(reporte.evidencia_url)}"
                  target="_blank"
                  rel="noopener"
                >
                  Ver evidencia
                </a>
              </div>
            `
            : ""
        }
      </div>
    `;

    document.body.appendChild(modal);

    modal
      .querySelector(".btn-cerrar-detalle-reporte")
      .addEventListener("click", () => modal.remove());

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });

  } catch (error) {
    console.error("Error al cargar detalle del reporte:", error);

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Error",
        "No se pudo cargar el detalle del reporte"
      );
    } else {
      alert("No se pudo cargar el detalle del reporte");
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

        <label class="reporte-evidencia-label" for="evidenciaReporte">
          Evidencia obligatoria
        </label>

        <p class="reporte-evidencia-help">
          Adjunta una imagen o PDF que respalde el reporte.
        </p>

        <input
          type="file"
          id="evidenciaReporte"
          accept="image/*,.pdf"
          required
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

      if (!archivo) {

        if (window.EduQuakUI) {
          window.EduQuakUI.error(
            "Evidencia obligatoria",
            "Debes adjuntar una imagen o PDF para enviar el reporte."
          );
        } else {
          alert("Debes adjuntar una imagen o PDF para enviar el reporte.");
        }

        return;
      }

      formData.append(
        "evidencia",
        archivo
      );

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

asesoriasCache = asesoriasCache.map(
  (a) => {

    if (
      a.id_asesoria == idAsesoria
    ) {

      return {
        ...a,
        reporte_enviado: true
      };
    }

    return a;
  }
);

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

    const reporteEnviado =
      normalizarReporteEnviado(asesoria.reporte_enviado);

    const tienePagoAprobado = pagoAprobado(asesoria);

    const tieneVideo =
      asesoria.estado === "aceptada" &&
      room &&
      tienePagoAprobado;

    const card =
      document.createElement("article");

    card.className =
      "asesoria-card";

    card.innerHTML = `

      <div class="card-top">

        <div>

          <h3>
            ${asesoria.nombre_asesor || "Asesor"}
            <span class="role-badge role-asesor inline">Asesor</span>
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
        ${formatearFechaCorta(asesoria.fecha)}
      </p>

      <p class="info-line">
        <strong>Hora:</strong>
        ${asesoria.hora || "Pendiente"}
      </p>

      ${renderAvisoReagenda(asesoria)}

      ${renderResumenPago(asesoria)}

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
          asesoria.estado === "aceptada" && !tienePagoAprobado
            ? `
              <button
                class="btn primary"
                data-pagar="${asesoria.id_asesoria}"
              >
                Pagar asesoría
              </button>
            `
            : ""
        }

        ${
          asesoria.estado === "aceptada" && tienePagoAprobado
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

    ? reporteEnviado

      ? `
        <button
          class="btn outline"
          data-ver-reporte="${asesoria.id_asesoria}"
        >
          Ver reporte
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

    const btnPagar =
      card.querySelector("[data-pagar]");

    if (btnPagar) {
      btnPagar.addEventListener(
        "click",
        () => iniciarPagoAsesoria(asesoria.id_asesoria, btnPagar)
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

    const btnVerReporte =
      card.querySelector("[data-ver-reporte]");

    if (btnVerReporte) {
      btnVerReporte.addEventListener(
        "click",
        () => abrirDetalleReporte(asesoria.id_asesoria)
      );
    }

    contenedor.appendChild(card);
  });

  document.dispatchEvent(new CustomEvent("eduquak:chat-rendered"));
}

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

document
  .querySelectorAll(".tab-estado-btn")
  .forEach((btn) => {
    btn.addEventListener(
      "click",
      () => cambiarFiltroEstado(btn.dataset.estado)
    );
  });

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

  if (alumnoNoVerificado() || perfil.sancion_activa) {

    renderBloqueado(perfil);

    return;
  }

  cargarMisAsesorias();
}

init();
