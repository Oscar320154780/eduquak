const API = window.EDUQUAK_API_URL || "";

const token =
  localStorage.getItem("token");

if (!token) {

  window.location.href =
    "/pages/login.html";

}

/* =========================
   ELEMENTOS
========================= */

const reportesGrid =
  document.getElementById(
    "reportesGrid"
  );

const buscarInput =
  document.getElementById(
    "buscarReporte"
  );

const tabs =
  document.querySelectorAll(
    ".tab-btn"
  );

const modalReporte =
  document.getElementById(
    "modalReporte"
  );

const modalBody =
  document.getElementById(
    "modalBody"
  );

const modalTitulo =
  document.getElementById(
    "modalTitulo"
  );

const modalSubtitulo =
  document.getElementById(
    "modalSubtitulo"
  );

const btnCerrarModal =
  document.getElementById(
    "btnCerrarModal"
  );

const modalEvidencia =
  document.getElementById(
    "modalEvidencia"
  );

const iframeEvidencia =
  document.getElementById(
    "iframeEvidencia"
  );

const imagenEvidencia =
  document.getElementById(
    "imagenEvidencia"
  );

const btnCerrarEvidencia =
  document.getElementById(
    "btnCerrarEvidencia"
  );

const btnAbrirEvidencia =
  document.getElementById(
    "btnAbrirEvidencia"
  );

const btnDescargarEvidencia =
  document.getElementById(
    "btnDescargarEvidencia"
  );

/* =========================
   ESTADO
========================= */

let reportes = [];

let estadoActual = "";

/* =========================
   FETCH
========================= */

async function fetchJson(
  url,
  options = {}
) {

  const response =
    await fetch(url, {

      ...options,

      headers: {

        Authorization:
          `Bearer ${token}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    });

  return response.json();

}

/* =========================
   CARGAR REPORTES
========================= */

async function cargarReportes() {

  try {

    const data =
      await fetchJson(
        `${API}/api/admin/reportes`
      );

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          data.message ||
          "No se pudieron cargar reportes"
      });

      return;

    }

    reportes =
      data.reportes || [];

    actualizarKPIs(
      data.resumen || {}
    );

    renderReportes();

  } catch (error) {

    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        "Error al cargar reportes"
    });

  }

}

/* =========================
   KPIS
========================= */

function actualizarKPIs(
  resumen
) {

  document.getElementById(
    "kpiTotal"
  ).textContent =
    resumen.total || 0;

  document.getElementById(
    "kpiPendientes"
  ).textContent =
    resumen.pendientes || 0;

  document.getElementById(
    "kpiRevisados"
  ).textContent =
    resumen.revisados || 0;

  document.getElementById(
    "kpiResueltos"
  ).textContent =
    resumen.resueltos || 0;

}

/* =========================
   RENDER
========================= */

function renderReportes() {

  let filtrados =
    [...reportes];

  const texto =
    buscarInput.value
      .toLowerCase()
      .trim();

  if (texto) {

    filtrados =
      filtrados.filter(r =>

        r.nombre_alumno
          .toLowerCase()
          .includes(texto)

        ||

        r.nombre_asesor
          .toLowerCase()
          .includes(texto)

        ||

        r.motivo
          .toLowerCase()
          .includes(texto)

      );

  }

  if (estadoActual) {

    filtrados =
      filtrados.filter(
        r =>
          r.estado ===
          estadoActual
      );

  }

  if (filtrados.length === 0) {

    reportesGrid.innerHTML = `

      <div class="empty-state">

        No se encontraron reportes.

      </div>

    `;

    return;

  }

  reportesGrid.innerHTML = "";

  filtrados.forEach(reporte => {

    const prioridad =
      obtenerPrioridad(
        reporte.total_reportes
      );

    reportesGrid.innerHTML += `

      <article class="reporte-card">

        <div class="reporte-top">

          <div>

            <span class="
              prioridad-badge
              ${prioridad.class}
            ">

              ${prioridad.label}

            </span>

            <h3 class="reporte-title">

              ${reporte.motivo}

            </h3>

          </div>

          <span class="
            estado-badge
            ${reporte.estado}
          ">

            ${capitalizar(
              reporte.estado
            )}

          </span>

        </div>

        <p class="reporte-description">

          ${reporte.descripcion}

        </p>

        <div class="reporte-meta">

          <span>
            Alumno: ${reporte.nombre_alumno}
          </span>

          <span>
            Asesor: ${reporte.nombre_asesor}
          </span>

          <span>
            Fecha:  ${formatearFecha(
              reporte.fecha_reporte
            )}
          </span>

        </div>

        <div class="reportes-total">

           Total reportes asesor:
          <strong>
            ${reporte.total_reportes}
          </strong>

        </div>

        <div class="reporte-actions">

          <button
            class="btn outline"
            onclick="verDetalle(
              ${reporte.id_reporte}
            )"
          >
            Ver detalle
          </button>

          ${
            reporte.evidencia_url
              ? `
                <button
                  class="btn primary"
                  onclick="verEvidencia(
                    '${reporte.evidencia_url}',
                    '${reporte.tipo_evidencia}'
                  )"
                >
                  Ver evidencia
                </button>
              `
              : ""
          }

        </div>

      </article>

    `;

  });

}

/* =========================
   PRIORIDAD
========================= */

function obtenerPrioridad(
  total
) {

  const numero =
    Number(total || 0);

  if (numero >= 4) {

    return {
      label: "Alta",
      class: "alta"
    };

  }

  if (numero >= 2) {

    return {
      label: "Media",
      class: "media"
    };

  }

  return {
    label: "Baja",
    class: "baja"
  };

}

/* =========================
   DETALLE
========================= */

function verDetalle(
  id
) {

  const reporte =
    reportes.find(
      r => r.id_reporte == id
    );

  if (!reporte) {
    return;
  }

  modalTitulo.textContent =
    reporte.motivo;

  modalSubtitulo.textContent = `

    ${reporte.nombre_alumno}
    •
    ${reporte.nombre_asesor}

  `;

  modalBody.innerHTML = `

    <div class="detalle-grid">

      <div class="detalle-card">

        <span class="detalle-label">
          Alumno
        </span>

        <strong>
          ${reporte.nombre_alumno}
        </strong>

        <small>
          ${reporte.correo_alumno}
        </small>

      </div>

      <div class="detalle-card">

        <span class="detalle-label">
          Asesor
        </span>

        <strong>
          ${reporte.nombre_asesor}
        </strong>

        <small>
          ${reporte.correo_asesor}
        </small>

      </div>

      <div class="detalle-card">

        <span class="detalle-label">
          Fecha asesoría
        </span>

        <strong>
          ${reporte.fecha_asesoria || "-"}
        </strong>

      </div>

      <div class="detalle-card">

        <span class="detalle-label">
          Hora
        </span>

        <strong>
          ${reporte.hora_asesoria || "-"}
        </strong>

      </div>

    </div>

    <div class="timeline-box">

      <div class="timeline-item">

        <div class="timeline-dot"></div>

        <div>

          <strong>
            Reporte creado
          </strong>

          <p>
            ${formatearFecha(
              reporte.fecha_reporte
            )}
          </p>

        </div>

      </div>

      <div class="timeline-item">

        <div class="timeline-dot active"></div>

        <div>

          <strong>
            Estado actual
          </strong>

          <p>
            ${capitalizar(
              reporte.estado
            )}
          </p>

        </div>

      </div>

    </div>

    <div class="descripcion-box">

      <h4>
        Descripción
      </h4>

      <p>
        ${reporte.descripcion}
      </p>

    </div>

    <div class="estado-actions">

      <button
        class="btn warning"
        onclick="actualizarEstado(
          ${reporte.id_reporte},
          'pendiente'
        )"
      >
        Pendiente
      </button>

      <button
        class="btn info"
        onclick="actualizarEstado(
          ${reporte.id_reporte},
          'revisado'
        )"
      >
        Revisado
      </button>

      <button
        class="btn success"
        onclick="actualizarEstado(
          ${reporte.id_reporte},
          'resuelto'
        )"
      >
        Resuelto
      </button>

    </div>

  `;

  modalReporte.classList
    .remove("hidden");

}

/* =========================
   ESTADO
========================= */

async function actualizarEstado(
  id,
  estado
) {

  try {

    const data =
      await fetchJson(
        `${API}/api/admin/reportes/${id}`,
        {

          method: "PUT",

          body: JSON.stringify({
            estado
          })

        }
      );

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message
      });

      return;

    }

    Swal.fire({
      icon: "success",
      title:
        "Estado actualizado",
      timer: 1400,
      showConfirmButton: false
    });

    modalReporte.classList
      .add("hidden");

    cargarReportes();

  } catch (error) {

    console.error(error);

  }

}

/* =========================
   EVIDENCIA
========================= */

function verEvidencia(
  url,
  tipo
) {

  const fullUrl =
    `${API}${url}`;

  btnAbrirEvidencia.href =
    fullUrl;

  btnDescargarEvidencia.href =
    fullUrl;

  iframeEvidencia.classList
    .add("hidden");

  imagenEvidencia.classList
    .add("hidden");

  if (
    tipo &&
    tipo.startsWith("image")
  ) {

    imagenEvidencia.src =
      fullUrl;

    imagenEvidencia.classList
      .remove("hidden");

  } else {

    iframeEvidencia.src =
      fullUrl;

    iframeEvidencia.classList
      .remove("hidden");

  }

  modalEvidencia.classList
    .remove("hidden");

}

/* =========================
   HELPERS
========================= */

function formatearFecha(
  fecha
) {

  return new Date(fecha)
    .toLocaleDateString(
      "es-MX",
      {

        year: "numeric",
        month: "long",
        day: "numeric"

      }
    );

}

function capitalizar(
  texto
) {

  return texto.charAt(0)
    .toUpperCase()
    +
    texto.slice(1);

}

/* =========================
   BUSCADOR
========================= */

buscarInput
?.addEventListener(
  "input",
  renderReportes
);

/* =========================
   TABS
========================= */

tabs.forEach(tab => {

  tab.addEventListener(
    "click",
    () => {

      tabs.forEach(t =>
        t.classList.remove(
          "active"
        )
      );

      tab.classList.add(
        "active"
      );

      estadoActual =
        tab.dataset.estado;

      renderReportes();

    }
  );

});

/* =========================
   MODALES
========================= */

btnCerrarModal
?.addEventListener(
  "click",
  () => {

    modalReporte.classList
      .add("hidden");

  }
);

btnCerrarEvidencia
?.addEventListener(
  "click",
  () => {

    modalEvidencia.classList
      .add("hidden");

    iframeEvidencia.src = "";

    imagenEvidencia.src = "";

  }
);

/* =========================
   LOGOUT
========================= */

document
  .getElementById(
    "btnLogout"
  )
  ?.addEventListener(
    "click",
    () => {

      localStorage.clear();

      window.location.href =
        "/pages/login.html";

    }
  );

/* =========================
   INIT
========================= */

cargarReportes();