const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

const usuariosGrid = document.querySelector(".usuarios-grid");
const buscarInput = document.getElementById("buscarUsuario");
const filtroRol = document.getElementById("filtroRol");
const btnBuscar = document.getElementById("btnBuscarUsuarios");
const tabsEstado = document.querySelectorAll(".tab-btn");
const paginationContainer = document.getElementById("usuariosPagination");

const totalUsuarios = document.getElementById("totalUsuarios");
const totalPendientes = document.getElementById("totalPendientes");
const totalVerificados = document.getElementById("totalVerificados");
const totalRechazados = document.getElementById("totalRechazados");

const modalPdf = document.getElementById("modalPdf");
const pdfViewer = document.getElementById("pdfViewer");
const btnCerrarPdf = document.getElementById("btnCerrarPdf");
const btnAbrirPdf = document.getElementById("btnAbrirPdf");
const btnDescargarPdf = document.getElementById("btnDescargarPdf");

let estadoActivo = "";
let paginaActual = 1;
const limitePorPagina = 20;
let paginacionActual = {
  page: 1,
  limit: limitePorPagina,
  total: 0,
  totalPages: 1
};

function mostrarToast(mensaje, tipo = "success") {
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

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function construirDocumentoUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API}${url}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

function construirUrlUsuarios() {
  const params = new URLSearchParams();

  params.set("page", String(paginaActual));
  params.set("limit", String(limitePorPagina));

  const search = buscarInput.value.trim();
  const rol = filtroRol.value;

  if (search) params.set("search", search);
  if (rol) params.set("rol", rol);
  if (estadoActivo) params.set("estado", estadoActivo);

  return `${API}/api/admin/users?${params.toString()}`;
}

async function cargarUsuarios() {
  try {
    usuariosGrid.innerHTML = `
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
    `;

    if (paginationContainer) {
      paginationContainer.innerHTML = "";
    }

    const { response, data } = await fetchJson(construirUrlUsuarios());

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "No se pudieron cargar usuarios");
    }

    actualizarContadores(data.resumen || {});
    paginacionActual = data.pagination || paginacionActual;
    renderUsuarios(data.users || []);
    renderPaginacion();
  } catch (error) {
    console.error(error);

    usuariosGrid.innerHTML = `
      <div class="empty-state">
        ${escaparHTML(error.message)}
      </div>
    `;

    mostrarToast("Error al cargar usuarios", "error");
  }
}

function actualizarContadores(resumen) {
  totalUsuarios.textContent = resumen.total ?? 0;
  totalPendientes.textContent = resumen.pendientes ?? 0;
  totalVerificados.textContent = resumen.verificados ?? 0;
  totalRechazados.textContent = resumen.rechazados ?? 0;
}

function renderUsuarios(usuarios) {
  if (!usuarios.length) {
    usuariosGrid.innerHTML = `
      <div class="empty-state">
        No se encontraron usuarios en esta página.
      </div>
    `;
    return;
  }

  usuariosGrid.innerHTML = usuarios.map((usuario) => {
    const documento = construirDocumentoUrl(usuario.documento_url);
    const nombreSeguro = escaparHTML(usuario.nombre);
    const correoSeguro = escaparHTML(usuario.correo);

    return `
      <article class="usuario-card">
        <div class="usuario-top">
          <div class="usuario-identidad">
            <h3>${nombreSeguro}</h3>
            <span class="usuario-correo">${correoSeguro}</span>
          </div>
          ${renderEstado(usuario.estado_validacion)}
        </div>

        <div class="usuario-info">
          <p><strong>Rol:</strong> ${escaparHTML(usuario.rol)}</p>
          <p><strong>Institución:</strong> ${escaparHTML(usuario.institucion || "-")}</p>
          <p><strong>Registro:</strong> ${formatearFecha(usuario.fecha_registro)}</p>
          ${usuario.especialidad ? `<p><strong>Especialidad:</strong> ${escaparHTML(usuario.especialidad)}</p>` : ""}
          ${usuario.materias ? `<p><strong>Materias:</strong> ${escaparHTML(usuario.materias)}</p>` : ""}
          ${usuario.motivo_rechazo ? `<div class="motivo-box"><strong>Motivo:</strong> ${escaparHTML(usuario.motivo_rechazo)}</div>` : ""}
        </div>

        <div class="usuario-actions">
          ${usuario.estado_validacion !== "verificado" ? `
            <button class="btn success" data-action="approve" data-id="${usuario.id_usuario}" data-nombre="${nombreSeguro}">
              Aprobar
            </button>
          ` : ""}

          ${usuario.estado_validacion !== "rechazado" ? `
            <button class="btn danger" data-action="reject" data-id="${usuario.id_usuario}" data-nombre="${nombreSeguro}">
              Rechazar
            </button>
          ` : ""}

          <button class="btn outline" data-action="document" data-url="${escaparHTML(documento)}">
            Ver documento
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderEstado(estado) {
  if (estado === "verificado") {
    return `<span class="status-pill success">Verificado</span>`;
  }

  if (estado === "rechazado") {
    return `<span class="status-pill danger">Rechazado</span>`;
  }

  return `<span class="status-pill pending">Pendiente</span>`;
}

function renderPaginacion() {
  if (!paginationContainer) return;

  const { page, total, totalPages, limit } = paginacionActual;
  const inicio = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const fin = Math.min(page * limit, total);

  paginationContainer.innerHTML = `
    <div class="pagination-info">
      Mostrando <strong>${inicio}-${fin}</strong> de <strong>${total}</strong> usuarios
    </div>
    <div class="pagination-actions">
      <button class="btn outline" type="button" data-page="first" ${page <= 1 ? "disabled" : ""}>Primera</button>
      <button class="btn outline" type="button" data-page="prev" ${page <= 1 ? "disabled" : ""}>Anterior</button>
      <span class="pagination-page">Página ${page} de ${totalPages}</span>
      <button class="btn outline" type="button" data-page="next" ${page >= totalPages ? "disabled" : ""}>Siguiente</button>
      <button class="btn outline" type="button" data-page="last" ${page >= totalPages ? "disabled" : ""}>Última</button>
    </div>
  `;
}

function cambiarPagina(accion) {
  const totalPages = paginacionActual.totalPages || 1;

  if (accion === "first") paginaActual = 1;
  if (accion === "prev") paginaActual = Math.max(1, paginaActual - 1);
  if (accion === "next") paginaActual = Math.min(totalPages, paginaActual + 1);
  if (accion === "last") paginaActual = totalPages;

  cargarUsuarios();
}

function reiniciarYCargar() {
  paginaActual = 1;
  cargarUsuarios();
}

function formatearFecha(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-MX");
}

function confirmarAprobarUsuario(id, nombre) {
  Swal.fire({
    title: "¿Aprobar usuario?",
    text: `Se aprobará la cuenta de ${nombre}.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, aprobar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#64748b"
  }).then((result) => {
    if (result.isConfirmed) {
      aprobarUsuario(id);
    }
  });
}

async function aprobarUsuario(id) {
  try {
    const { response, data } = await fetchJson(`${API}/api/admin/users/${id}/approve`, {
      method: "PUT"
    });

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "No se pudo aprobar el usuario");
    }

    mostrarToast(data.message || "Usuario aprobado correctamente", "success");
    cargarUsuarios();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Error al aprobar usuario", "error");
  }
}

function confirmarRechazarUsuario(id, nombre) {
  Swal.fire({
    title: "Rechazar usuario",
    html: `
      <p style="margin-bottom:16px;color:#64748b;">
        Escribe el motivo del rechazo para <strong>${escaparHTML(nombre)}</strong>
      </p>
    `,
    input: "textarea",
    inputPlaceholder: "Ejemplo:\nDocumento ilegible\nInformación incorrecta\nArchivo inválido...",
    inputAttributes: {
      autocapitalize: "off"
    },
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return "Debes escribir un motivo";
      }
    },
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Rechazar usuario",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b"
  }).then(async (result) => {
    if (result.isConfirmed) {
      await rechazarUsuario(id, result.value);
    }
  });
}

async function rechazarUsuario(id, motivo) {
  try {
    const { response, data } = await fetchJson(`${API}/api/admin/users/${id}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        motivo_rechazo: motivo
      })
    });

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "No se pudo rechazar el usuario");
    }

    mostrarToast(data.message || "Usuario rechazado correctamente", "success");
    cargarUsuarios();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Error al rechazar usuario", "error");
  }
}

function verDocumento(url) {
  if (!url) {
    mostrarToast("Este usuario no tiene documento.", "warning");
    return;
  }

  pdfViewer.src = `${url}#toolbar=1&navpanes=0&scrollbar=1`;
  btnAbrirPdf.href = url;
  btnDescargarPdf.href = url;
  modalPdf.classList.remove("hidden");
}

function cerrarModalPdf() {
  modalPdf.classList.add("hidden");
  pdfViewer.src = "";
  btnAbrirPdf.href = "";
  btnDescargarPdf.href = "";
}

usuariosGrid?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) return;

  const action = boton.dataset.action;
  const id = boton.dataset.id;
  const nombre = boton.dataset.nombre || "usuario";

  if (action === "approve") confirmarAprobarUsuario(id, nombre);
  if (action === "reject") confirmarRechazarUsuario(id, nombre);
  if (action === "document") verDocumento(boton.dataset.url || "");
});

paginationContainer?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-page]");
  if (!boton || boton.disabled) return;
  cambiarPagina(boton.dataset.page);
});

tabsEstado.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabsEstado.forEach((btn) => btn.classList.remove("active"));
    tab.classList.add("active");
    estadoActivo = tab.dataset.estado || "";
    reiniciarYCargar();
  });
});

btnBuscar?.addEventListener("click", reiniciarYCargar);

buscarInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    reiniciarYCargar();
  }
});

filtroRol?.addEventListener("change", reiniciarYCargar);

btnCerrarPdf?.addEventListener("click", cerrarModalPdf);

modalPdf?.addEventListener("click", (event) => {
  if (event.target.id === "modalPdf") {
    cerrarModalPdf();
  }
});

document.getElementById("btnLogout")?.addEventListener("click", () => {
  Swal.fire({
    title: "¿Cerrar sesión?",
    text: "Tu sesión actual se cerrará.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, salir",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b"
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("token");
      window.location.href = "/pages/login.html";
    }
  });
});

cargarUsuarios();
