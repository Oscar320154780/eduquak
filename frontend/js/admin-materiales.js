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

const materialesGrid =
  document.getElementById(
    "materialesGrid"
  );

const buscarInput =
  document.getElementById(
    "buscarMaterial"
  );

const tabs =
  document.querySelectorAll(
    ".tab-btn"
  );

const modalPdf =
  document.getElementById(
    "modalPdf"
  );

const pdfViewer =
  document.getElementById(
    "pdfViewer"
  );

const btnCerrarPdf =
  document.getElementById(
    "btnCerrarPdf"
  );

const btnAbrirPdf =
  document.getElementById(
    "btnAbrirPdf"
  );

const btnDescargarPdf =
  document.getElementById(
    "btnDescargarPdf"
  );

/* =========================
   ESTADO
========================= */

let materiales = [];

let estadoActual = "";

/* =========================
   FETCH JSON
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
   CARGAR MATERIALES
========================= */

async function cargarMateriales() {

  try {

    const data =
      await fetchJson(
        `${API}/api/materiales/admin/todos`
      );

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          data.message ||
          "No se pudieron cargar materiales"
      });

      return;
    }

    materiales =
      data.materiales || [];

    actualizarKPIs();

    renderMateriales();

  } catch (error) {

    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        "Error al cargar materiales"
    });

  }

}

/* =========================
   KPIS
========================= */

function actualizarKPIs() {

  const total =
    materiales.length;

  const pendientes =
    materiales.filter(
      m =>
        m.estado_revision ===
        "pendiente_revision"
    ).length;

  const aprobados =
    materiales.filter(
      m =>
        m.estado_revision ===
        "aprobado"
    ).length;

  const rechazados =
    materiales.filter(
      m =>
        m.estado_revision ===
        "rechazado"
    ).length;

  document.getElementById(
    "totalMateriales"
  ).textContent = total;

  document.getElementById(
    "totalPendientes"
  ).textContent = pendientes;

  document.getElementById(
    "totalAprobados"
  ).textContent = aprobados;

  document.getElementById(
    "totalRechazados"
  ).textContent = rechazados;

}

/* =========================
   RENDER
========================= */

function renderMateriales() {

  let filtrados =
    [...materiales];

  const texto =
    buscarInput.value
      .toLowerCase()
      .trim();

  if (texto) {

    filtrados =
      filtrados.filter(m =>

        m.titulo
          .toLowerCase()
          .includes(texto)

        ||

        m.materia
          .toLowerCase()
          .includes(texto)

        ||

        m.nombre_asesor
          .toLowerCase()
          .includes(texto)

      );

  }

  if (estadoActual) {

    filtrados =
      filtrados.filter(
        m =>
          m.estado_revision ===
          estadoActual
      );

  }

  if (filtrados.length === 0) {

    materialesGrid.innerHTML = `

      <div class="empty-state">

        No se encontraron materiales.

      </div>

    `;

    return;

  }

  materialesGrid.innerHTML = "";

  filtrados.forEach(material => {

    materialesGrid.innerHTML += `

      <article class="material-card">

        <div class="material-top">

          <div>

            <span class="material-badge">

              ${material.materia}

            </span>

            <h3 class="material-title">

              ${material.titulo}

            </h3>

          </div>

          <span class="
            estado-badge
            ${material.estado_revision}
          ">

            ${formatEstado(
              material.estado_revision
            )}

          </span>

        </div>

        <p class="material-description">

          ${
            material.descripcion ||
            "Sin descripción"
          }

        </p>

        <div class="material-meta">

          <span>
            👤 ${material.nombre_asesor}
          </span>

          <span>
            Fecha: ${formatFecha(
              material.fecha_subida
            )}
          </span>

        </div>

        ${
          material.motivo_revision
            ? `
              <div class="motivo-box">

                <strong>
                  Motivo:
                </strong>

                ${material.motivo_revision}

              </div>
            `
            : ""
        }

        <div class="material-actions">

          <button
            class="btn outline"
            onclick="abrirPdf(
              '${material.archivo_url}'
            )"
          >
            Ver PDF
          </button>

          <button
            class="btn success"
            onclick="aprobarMaterial(
              ${material.id_material}
            )"
          >
            Aprobar
          </button>

          <button
            class="btn danger"
            onclick="rechazarMaterial(
              ${material.id_material}
            )"
          >
            Rechazar
          </button>

        </div>

      </article>

    `;

  });

}

/* =========================
   FORMATEAR
========================= */

function formatEstado(
  estado
) {

  switch (estado) {

    case "pendiente_revision":
      return "Pendiente";

    case "aprobado":
      return "Aprobado";

    case "rechazado":
      return "Rechazado";

    default:
      return estado;

  }

}

function formatFecha(
  fecha
) {

  return new Date(fecha)
    .toLocaleDateString("es-MX");

}

/* =========================
   APROBAR
========================= */

async function aprobarMaterial(
  id
) {

  const result =
    await Swal.fire({

      title:
        "¿Aprobar material?",

      text:
        "El material será visible para alumnos.",

      icon: "question",

      showCancelButton: true,

      confirmButtonText:
        "Sí, aprobar",

      cancelButtonText:
        "Cancelar"
    });

  if (!result.isConfirmed) {
    return;
  }

  try {

    const data =
      await fetchJson(
        `${API}/api/materiales/admin/${id}/approve`,
        {
          method: "PUT"
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
      title: "Material aprobado",
      timer: 1600,
      showConfirmButton: false
    });

    cargarMateriales();

  } catch (error) {

    console.error(error);

  }

}

/* =========================
   RECHAZAR
========================= */

async function rechazarMaterial(
  id
) {

  const result =
    await Swal.fire({

      title:
        "Rechazar material",

      input: "textarea",

      inputLabel:
        "Motivo del rechazo",

      inputPlaceholder:
        "Ej. Archivo incorrecto...",

      showCancelButton: true,

      confirmButtonText:
        "Rechazar",

      cancelButtonText:
        "Cancelar"
    });

  if (!result.isConfirmed) {
    return;
  }

  try {

    const data =
      await fetchJson(
        `${API}/api/materiales/admin/${id}/reject`,
        {

          method: "PUT",

          body: JSON.stringify({

            motivo_revision:
              result.value

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
      title: "Material rechazado",
      timer: 1600,
      showConfirmButton: false
    });

    cargarMateriales();

  } catch (error) {

    console.error(error);

  }

}

/* =========================
   PDF
========================= */

function abrirPdf(
  url
) {

  const fullUrl =
    `${API}${url}`;

  pdfViewer.src = fullUrl;

  btnAbrirPdf.href =
    fullUrl;

  btnDescargarPdf.href =
    fullUrl;

  modalPdf.classList
    .remove("hidden");

}

btnCerrarPdf
?.addEventListener(
  "click",
  () => {

    modalPdf.classList
      .add("hidden");

    pdfViewer.src = "";

  }
);

/* =========================
   BUSCADOR
========================= */

buscarInput
?.addEventListener(
  "input",
  renderMateriales
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

      renderMateriales();

    }
  );

});

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

cargarMateriales();