const API = window.EDUQUAK_API_URL || "";

const token =
  localStorage.getItem("token");

/* =========================
   ELEMENTOS
========================= */

const usuariosGrid =
  document.querySelector(".usuarios-grid");

const buscarInput =
  document.getElementById("buscarUsuario");

const filtroRol =
  document.getElementById("filtroRol");

const btnBuscar =
  document.getElementById("btnBuscarUsuarios");

const tabsEstado =
  document.querySelectorAll(".tab-btn");

/* =========================
   CONTADORES
========================= */

const totalUsuarios =
  document.getElementById(
    "totalUsuarios"
  );

const totalPendientes =
  document.getElementById(
    "totalPendientes"
  );

const totalVerificados =
  document.getElementById(
    "totalVerificados"
  );

const totalRechazados =
  document.getElementById(
    "totalRechazados"
  );

/* =========================
   MODAL PDF
========================= */

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
   ESTADO ACTIVO
========================= */

let estadoActivo = "";

/* =========================
   TOAST
========================= */

function mostrarToast(
  mensaje,
  tipo = "success"
) {

  Swal.fire({

    toast: true,

    position: "top-end",

    icon: tipo,

    title: mensaje,

    showConfirmButton: false,

    timer: 2500,

    timerProgressBar: true

  });

}

/* =========================
   TABS
========================= */

tabsEstado.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      tabsEstado.forEach((btn) => {

        btn.classList.remove(
          "active"
        );

      });

      tab.classList.add(
        "active"
      );

      estadoActivo =
        tab.dataset.estado;

      cargarUsuarios();

    }
  );

});

/* =========================
   LOGOUT
========================= */

document
  .getElementById("btnLogout")
  .addEventListener(
    "click",
    () => {

      Swal.fire({

        title:
          "¿Cerrar sesión?",

        text:
          "Tu sesión actual se cerrará.",

        icon:
          "question",

        showCancelButton:
          true,

        confirmButtonText:
          "Sí, salir",

        cancelButtonText:
          "Cancelar",

        confirmButtonColor:
          "#dc2626",

        cancelButtonColor:
          "#64748b"

      }).then((result) => {

        if (
          result.isConfirmed
        ) {

          localStorage.removeItem(
            "token"
          );

          window.location.href =
            "/pages/login.html";

        }

      });

    }
  );

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

        ...(options.headers || {}),

        Authorization:
          `Bearer ${token}`
      }
    });

  const data =
    await response.json();

  return {
    response,
    data
  };

}

/* =========================
   CARGAR USUARIOS
========================= */

async function cargarUsuarios() {

  try {

    usuariosGrid.innerHTML =
      `
        <div class="usuario-skeleton"></div>
        <div class="usuario-skeleton"></div>
        <div class="usuario-skeleton"></div>
        <div class="usuario-skeleton"></div>
      `;

    const { data } =
      await fetchJson(
        `${API}/api/admin/users`
      );

    if (!data.ok) {

      throw new Error(
        data.message ||
        "No se pudieron cargar usuarios"
      );

    }

    actualizarContadores(
      data.users || []
    );

    renderUsuarios(
      data.users || []
    );

  } catch (error) {

    console.error(error);

    usuariosGrid.innerHTML =
      `
        <div class="empty-state">
          ${error.message}
        </div>
      `;

    mostrarToast(
      "Error al cargar usuarios",
      "error"
    );

  }

}

/* =========================
   CONTADORES
========================= */

function actualizarContadores(
  usuarios
) {

  totalUsuarios.textContent =
    usuarios.length;

  totalPendientes.textContent =
    usuarios.filter(
      (u) =>
        u.estado_validacion ===
        "pendiente"
    ).length;

  totalVerificados.textContent =
    usuarios.filter(
      (u) =>
        u.estado_validacion ===
        "verificado"
    ).length;

  totalRechazados.textContent =
    usuarios.filter(
      (u) =>
        u.estado_validacion ===
        "rechazado"
    ).length;

}

/* =========================
   RENDER
========================= */

function renderUsuarios(
  usuarios
) {

  const textoBusqueda =
    buscarInput.value
      .toLowerCase()
      .trim();

  const rol =
    filtroRol.value;

  const estado =
    estadoActivo;

  const filtrados =
    usuarios.filter((usuario) => {

      const coincideBusqueda =

        usuario.nombre
          .toLowerCase()
          .includes(
            textoBusqueda
          )

        ||

        usuario.correo
          .toLowerCase()
          .includes(
            textoBusqueda
          );

      const coincideRol =

        !rol ||

        usuario.rol === rol;

      const coincideEstado =

        !estado ||

        usuario.estado_validacion
          === estado;

      return (
        coincideBusqueda &&
        coincideRol &&
        coincideEstado
      );

    });

  if (
    filtrados.length === 0
  ) {

    usuariosGrid.innerHTML =
      `
        <div class="empty-state">
          No se encontraron usuarios.
        </div>
      `;

    return;

  }

  usuariosGrid.innerHTML =
    filtrados.map((usuario) => {

      let documento = "";

      if (
        usuario.documento_url
      ) {

        documento =
          `${API}${usuario.documento_url}`;

      }

      return `

        <article class="usuario-card">

          <div class="usuario-top">

            <div>

              <h3>
                ${usuario.nombre}
              </h3>

              <span class="usuario-correo">
                ${usuario.correo}
              </span>

            </div>

            ${renderEstado(
              usuario.estado_validacion
            )}

          </div>

          <div class="usuario-info">

            <p>
              <strong>
                Rol:
              </strong>

              ${usuario.rol}
            </p>

            <p>
              <strong>
                Institución:
              </strong>

              ${
                usuario.institucion || "-"
              }
            </p>

            <p>
              <strong>
                Registro:
              </strong>

              ${formatearFecha(
                usuario.fecha_registro
              )}
            </p>

          </div>

          <div class="usuario-actions">

            ${
              usuario.estado_validacion !==
              "verificado"

              ? `
                <button
                  class="btn success"
                  onclick="confirmarAprobarUsuario(
                    ${usuario.id_usuario},
                    '${usuario.nombre}'
                  )"
                >
                  Aprobar
                </button>
              `

              : ""
            }

            ${
              usuario.estado_validacion !==
              "rechazado"

              ? `
                <button
                  class="btn danger"
                  onclick="confirmarRechazarUsuario(
                    ${usuario.id_usuario},
                    '${usuario.nombre}'
                  )"
                >
                  Rechazar
                </button>
              `

              : ""
            }

            <button
              class="btn outline"
              onclick="verDocumento('${documento}')"
            >
              Ver documento
            </button>

          </div>

        </article>

      `;

    }).join("");

}

/* =========================
   ESTADO VISUAL
========================= */

function renderEstado(
  estado
) {

  if (
    estado === "verificado"
  ) {

    return `
      <span class="status-pill success">
        Verificado
      </span>
    `;

  }

  if (
    estado === "rechazado"
  ) {

    return `
      <span class="status-pill danger">
        Rechazado
      </span>
    `;

  }

  return `
    <span class="status-pill pending">
      Pendiente
    </span>
  `;

}

/* =========================
   FORMATEAR FECHA
========================= */

function formatearFecha(
  fecha
) {

  if (!fecha) return "-";

  return new Date(fecha)
    .toLocaleDateString(
      "es-MX"
    );

}

/* =========================
   APROBAR
========================= */

function confirmarAprobarUsuario(
  id,
  nombre
) {

  Swal.fire({

    title:
      "¿Aprobar usuario?",

    text:
      `Se aprobará la cuenta de ${nombre}.`,

    icon:
      "question",

    showCancelButton:
      true,

    confirmButtonText:
      "Sí, aprobar",

    cancelButtonText:
      "Cancelar",

    confirmButtonColor:
      "#16a34a",

    cancelButtonColor:
      "#64748b"

  }).then((result) => {

    if (
      result.isConfirmed
    ) {

      aprobarUsuario(id);

    }

  });

}

async function aprobarUsuario(
  id
) {

  try {

    const {
      response,
      data
    } =
      await fetchJson(
        `${API}/api/admin/users/${id}/approve`,
        {
          method: "PUT"
        }
      );

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.message ||
        "No se pudo aprobar el usuario"
      );

    }

    mostrarToast(
      data.message ||
      "Usuario aprobado correctamente",
      "success"
    );

    cargarUsuarios();

  } catch (error) {

    console.error(error);

    mostrarToast(
      error.message ||
      "Error al aprobar usuario",
      "error"
    );

  }

}

/* =========================
   RECHAZAR
========================= */

function confirmarRechazarUsuario(
  id,
  nombre
) {

  Swal.fire({

    title:
      "Rechazar usuario",

    html:
      `
        <p style="
          margin-bottom:16px;
          color:#64748b;
        ">
          Escribe el motivo del rechazo para
          <strong>${nombre}</strong>
        </p>
      `,

    input:
      "textarea",

    inputPlaceholder:
      "Ejemplo:\nDocumento ilegible\nInformación incorrecta\nArchivo inválido...",

    inputAttributes: {

      autocapitalize: "off"

    },

    inputValidator:
      (value) => {

        if (
          !value ||
          !value.trim()
        ) {

          return (
            "Debes escribir un motivo"
          );

        }

      },

    icon:
      "warning",

    showCancelButton:
      true,

    confirmButtonText:
      "Rechazar usuario",

    cancelButtonText:
      "Cancelar",

    confirmButtonColor:
      "#dc2626",

    cancelButtonColor:
      "#64748b"

  }).then(async (result) => {

    if (
      result.isConfirmed
    ) {

      await rechazarUsuario(
        id,
        result.value
      );

    }

  });

}

async function rechazarUsuario(
  id,
  motivo
) {

  try {

    const {
      response,
      data
    } =
      await fetchJson(
        `${API}/api/admin/users/${id}/reject`,
        {

          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            motivo_rechazo:
              motivo

          })

        }
      );

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.message ||
        "No se pudo rechazar el usuario"
      );

    }

    mostrarToast(
      data.message ||
      "Usuario rechazado correctamente",
      "success"
    );

    cargarUsuarios();

  } catch (error) {

    console.error(error);

    mostrarToast(
      error.message ||
      "Error al rechazar usuario",
      "error"
    );

  }

}

/* =========================
   MODAL PDF
========================= */

function verDocumento(
  url
) {

  if (!url) {

    mostrarToast(
      "Este usuario no tiene documento.",
      "warning"
    );

    return;

  }

  pdfViewer.src =
    `${url}#toolbar=1&navpanes=0&scrollbar=1`;

  btnAbrirPdf.href =
    url;

  btnDescargarPdf.href =
    url;

  modalPdf.classList.remove(
    "hidden"
  );

}

function cerrarModalPdf() {

  modalPdf.classList.add(
    "hidden"
  );

  pdfViewer.src = "";

  btnAbrirPdf.href = "";

  btnDescargarPdf.href = "";

}

btnCerrarPdf.addEventListener(
  "click",
  cerrarModalPdf
);

modalPdf.addEventListener(
  "click",
  (e) => {

    if (
      e.target.id ===
      "modalPdf"
    ) {

      cerrarModalPdf();

    }

  }
);

document.addEventListener(
  "keydown",
  (e) => {

    if (
      e.key === "Escape"
    ) {

      cerrarModalPdf();

    }

  }
);

/* =========================
   FILTROS
========================= */

btnBuscar.addEventListener(
  "click",
  cargarUsuarios
);

buscarInput.addEventListener(
  "input",
  cargarUsuarios
);

filtroRol.addEventListener(
  "change",
  cargarUsuarios
);

/* =========================
   INIT
========================= */

cargarUsuarios();