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

const cuestionariosGrid =
  document.getElementById(
    "cuestionariosGrid"
  );

const buscarInput =
  document.getElementById(
    "buscarCuestionario"
  );

const tabs =
  document.querySelectorAll(
    ".tab-btn"
  );

const modalPreguntas =
  document.getElementById(
    "modalPreguntas"
  );

const preguntasContainer =
  document.getElementById(
    "preguntasContainer"
  );

const modalTitulo =
  document.getElementById(
    "modalTituloCuestionario"
  );

const modalInfo =
  document.getElementById(
    "modalInfoCuestionario"
  );

const btnCerrarPreguntas =
  document.getElementById(
    "btnCerrarPreguntas"
  );

/* =========================
   ESTADO
========================= */

let cuestionarios = [];

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
   CARGAR
========================= */

async function cargarCuestionarios() {

  try {

    const data =
      await fetchJson(
        `${API}/api/cuestionarios/admin/todos`
      );

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          data.message ||
          "No se pudieron cargar cuestionarios"
      });

      return;

    }

    cuestionarios =
      data.cuestionarios || [];

    actualizarKPIs();

    renderCuestionarios();

  } catch (error) {

    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        "Error al cargar cuestionarios"
    });

  }

}

/* =========================
   KPIS
========================= */

function actualizarKPIs() {

  const total =
    cuestionarios.length;

  const pendientes =
    cuestionarios.filter(
      c =>
        c.estado_revision ===
        "pendiente_revision"
    ).length;

  const aprobados =
    cuestionarios.filter(
      c =>
        c.estado_revision ===
        "aprobado"
    ).length;

  const rechazados =
    cuestionarios.filter(
      c =>
        c.estado_revision ===
        "rechazado"
    ).length;

  document.getElementById(
    "totalCuestionarios"
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

function renderCuestionarios() {

  let filtrados =
    [...cuestionarios];

  const texto =
    buscarInput.value
      .toLowerCase()
      .trim();

  if (texto) {

    filtrados =
      filtrados.filter(c =>

        c.titulo
          .toLowerCase()
          .includes(texto)

        ||

        c.materia
          .toLowerCase()
          .includes(texto)

        ||

        c.nombre_asesor
          .toLowerCase()
          .includes(texto)

      );

  }

  if (estadoActual) {

    filtrados =
      filtrados.filter(
        c =>
          c.estado_revision ===
          estadoActual
      );

  }

  if (filtrados.length === 0) {

    cuestionariosGrid.innerHTML = `

      <div class="empty-state">

        No se encontraron cuestionarios.

      </div>

    `;

    return;

  }

  cuestionariosGrid.innerHTML = "";

  filtrados.forEach(c => {

    cuestionariosGrid.innerHTML += `

      <article class="cuestionario-card">

        <div class="cuestionario-top">

          <div>

            <span class="materia-badge">

              ${c.materia}

            </span>

            <h3 class="cuestionario-title">

              ${c.titulo}

            </h3>

          </div>

          <span class="
            estado-badge
            ${c.estado_revision}
          ">

            ${formatearEstado(
              c.estado_revision
            )}

          </span>

        </div>

        <p class="cuestionario-description">

          ${
            c.descripcion ||
            "Sin descripción"
          }

        </p>

        <div class="cuestionario-meta">

          <span>
            👤 ${c.nombre_asesor}
          </span>

          <span>
            Fecha: ${formatearFecha(
              c.fecha_creacion
            )}
          </span>

        </div>

        ${
          c.motivo_revision
            ? `
              <div class="motivo-box">

                <strong>
                  Motivo:
                </strong>

                ${c.motivo_revision}

              </div>
            `
            : ""
        }

        <div class="cuestionario-actions">

          <button
            class="btn outline"
            onclick="verPreguntas(
              ${c.id_cuestionario}
            )"
          >
            Ver preguntas
          </button>

          <button
            class="btn success"
            onclick="aprobarCuestionario(
              ${c.id_cuestionario}
            )"
          >
            Aprobar
          </button>

          <button
            class="btn danger"
            onclick="rechazarCuestionario(
              ${c.id_cuestionario}
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
   FORMATS
========================= */

function formatearEstado(
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

function formatearFecha(
  fecha
) {

  return new Date(fecha)
    .toLocaleDateString("es-MX");

}

/* =========================
   VER PREGUNTAS
========================= */

async function verPreguntas(
  id
) {

  try {

    const data =
      await fetchJson(
        `${API}/api/cuestionarios/admin/${id}/preguntas`
      );

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          data.message
      });

      return;

    }

    const {
      cuestionario,
      preguntas
    } = data;

    modalTitulo.textContent =
      cuestionario.titulo;

    modalInfo.textContent = `

      ${cuestionario.materia}
      •
      ${cuestionario.nombre_asesor}

    `;

    preguntasContainer.innerHTML = "";

    preguntas.forEach(
      (
        pregunta,
        index
      ) => {

        preguntasContainer.innerHTML += `

          <article class="pregunta-preview-card">

            <div class="pregunta-head">

              <span class="pregunta-number">

                Pregunta ${index + 1}

              </span>

            </div>

            <h4 class="pregunta-text">

              ${pregunta.pregunta}

            </h4>

            <div class="opciones-preview">

              ${crearOpcion(
                "A",
                pregunta.opcion_a,
                pregunta.respuesta_correcta
              )}

              ${crearOpcion(
                "B",
                pregunta.opcion_b,
                pregunta.respuesta_correcta
              )}

              ${crearOpcion(
                "C",
                pregunta.opcion_c,
                pregunta.respuesta_correcta
              )}

              ${crearOpcion(
                "D",
                pregunta.opcion_d,
                pregunta.respuesta_correcta
              )}

            </div>

          </article>

        `;

      }
    );

    modalPreguntas.classList
      .remove("hidden");

  } catch (error) {

    console.error(error);

  }

}

function crearOpcion(
  letra,
  texto,
  correcta
) {

  return `

    <div class="
      opcion-preview
      ${
        correcta === letra
          ? "correcta"
          : ""
      }
    ">

      <span class="opcion-letter">

        ${letra}

      </span>

      <span>

        ${texto}

      </span>

      ${
        correcta === letra
          ? `
            <span class="correcta-icon">
              ✅
            </span>
          `
          : ""
      }

    </div>

  `;

}

/* =========================
   APROBAR
========================= */

async function aprobarCuestionario(
  id
) {

  const result =
    await Swal.fire({

      title:
        "¿Aprobar cuestionario?",

      text:
        "Será visible para alumnos.",

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
        `${API}/api/cuestionarios/admin/${id}/approve`,
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
      title:
        "Cuestionario aprobado",
      timer: 1600,
      showConfirmButton: false
    });

    cargarCuestionarios();

  } catch (error) {

    console.error(error);

  }

}

/* =========================
   RECHAZAR
========================= */

async function rechazarCuestionario(
  id
) {

  const result =
    await Swal.fire({

      title:
        "Rechazar cuestionario",

      input: "textarea",

      inputLabel:
        "Motivo del rechazo",

      inputPlaceholder:
        "Ej. Preguntas incorrectas...",

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
        `${API}/api/cuestionarios/admin/${id}/reject`,
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
      title:
        "Cuestionario rechazado",
      timer: 1600,
      showConfirmButton: false
    });

    cargarCuestionarios();

  } catch (error) {

    console.error(error);

  }

}

/* =========================
   MODAL
========================= */

btnCerrarPreguntas
?.addEventListener(
  "click",
  () => {

    modalPreguntas.classList
      .add("hidden");

  }
);

/* =========================
   BUSCADOR
========================= */

buscarInput
?.addEventListener(
  "input",
  renderCuestionarios
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

      renderCuestionarios();

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

cargarCuestionarios();