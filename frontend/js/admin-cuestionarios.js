const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

const cuestionariosGrid = document.getElementById("cuestionariosGrid");
const buscarInput = document.getElementById("buscarCuestionario");
const tabs = document.querySelectorAll(".tab-btn");
const paginationContainer = document.getElementById("cuestionariosPagination");


let cuestionarios = [];
let estadoActual = "";
let paginaActual = 1;
const limitePorPagina = 20;
let paginacionActual = { page: 1, limit: limitePorPagina, total: 0, totalPages: 1 };

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function construirArchivoUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API}${url}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  return response.json().catch(() => ({}));
}

function construirUrlCuestionarios() {
  const params = new URLSearchParams();
  params.set("page", String(paginaActual));
  params.set("limit", String(limitePorPagina));

  const search = buscarInput.value.trim();
  if (search) params.set("search", search);
  if (estadoActual) params.set("estado", estadoActual);

  return `${API}/api/cuestionarios/admin/todos?${params.toString()}`;
}

async function cargarCuestionarios() {
  try {
    cuestionariosGrid.innerHTML = `
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
    `;

    if (paginationContainer) paginationContainer.innerHTML = "";

    const data = await fetchJson(construirUrlCuestionarios());

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message || "No se pudieron cargar cuestionarios" });
      return;
    }

    cuestionarios = data.cuestionarios || [];
    paginacionActual = data.pagination || paginacionActual;

    actualizarKPIs(data.resumen || {});
    renderCuestionarios();
    renderPaginacion();
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al cargar cuestionarios" });
  }
}

function actualizarKPIs(resumen) {
  document.getElementById("totalCuestionarios").textContent = resumen.total ?? 0;
  document.getElementById("totalPendientes").textContent = resumen.pendientes ?? 0;
  document.getElementById("totalAprobados").textContent = resumen.aprobados ?? 0;
  document.getElementById("totalRechazados").textContent = resumen.rechazados ?? 0;
}

function renderCuestionarios() {
  if (cuestionarios.length === 0) {
    cuestionariosGrid.innerHTML = `<div class="empty-state">No se encontraron cuestionarios.</div>`;
    return;
  }

  cuestionariosGrid.innerHTML = cuestionarios.map((c) => `
    <article class="cuestionario-card">
      <div class="cuestionario-top">
        <div>
          <span class="materia-badge">${escaparHTML(c.materia)}</span>
          <h3 class="cuestionario-title">${escaparHTML(c.titulo)}</h3>
        </div>
        <span class="estado-badge ${escaparHTML(c.estado_revision)}">${formatEstado(c.estado_revision)}</span>
      </div>

      <p class="cuestionario-description">${escaparHTML(c.descripcion || "Sin descripción")}</p>

      <div class="cuestionario-meta">
        <span>👤 ${escaparHTML(c.nombre_asesor)}</span>
        <span>Fecha: ${formatFecha(c.fecha_creacion)}</span>
      </div>

      ${c.motivo_revision ? `<div class="motivo-box"><strong>Motivo:</strong> ${escaparHTML(c.motivo_revision)}</div>` : ""}

      <div class="cuestionario-actions">
        <button class="btn outline" data-action="questions" data-id="${c.id_cuestionario}">Ver preguntas</button>
        <button class="btn success" data-action="approve" data-id="${c.id_cuestionario}">Aprobar</button>
        <button class="btn danger" data-action="reject" data-id="${c.id_cuestionario}">Rechazar</button>
      </div>
    </article>
  `).join("");
}

function renderPaginacion() {
  if (!paginationContainer) return;

  const { page, total, totalPages, limit } = paginacionActual;
  const inicio = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const fin = Math.min(page * limit, total);

  paginationContainer.innerHTML = `
    <div class="pagination-info">Mostrando <strong>${inicio}-${fin}</strong> de <strong>${total}</strong> cuestionarios</div>
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
  cargarCuestionarios();
}

function reiniciarYCargar() {
  paginaActual = 1;
  cargarCuestionarios();
}

function formatEstado(estado) {
  switch (estado) {
    case "pendiente_revision": return "Pendiente";
    case "aprobado": return "Aprobado";
    case "rechazado": return "Rechazado";
    default: return estado || "-";
  }
}

function formatFecha(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-MX");
}

async function aprobarCuestionario(id) {
  const result = await Swal.fire({
    title: "¿Aprobar cuestionario?",
    text: "El cuestionario será visible para alumnos.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, aprobar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  try {
    const data = await fetchJson(`${API}/api/cuestionarios/admin/${id}/approve`, { method: "PUT" });
    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }
    Swal.fire({ icon: "success", title: "Cuestionario aprobado", timer: 1600, showConfirmButton: false });
    cargarCuestionarios();
  } catch (error) {
    console.error(error);
  }
}

async function rechazarCuestionario(id) {
  const result = await Swal.fire({
    title: "Rechazar cuestionario",
    input: "textarea",
    inputLabel: "Motivo del rechazo",
    inputPlaceholder: "Ej. Archivo incorrecto...",
    showCancelButton: true,
    confirmButtonText: "Rechazar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  try {
    const data = await fetchJson(`${API}/api/cuestionarios/admin/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ motivo_revision: result.value })
    });
    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }
    Swal.fire({ icon: "success", title: "Cuestionario rechazado", timer: 1600, showConfirmButton: false });
    cargarCuestionarios();
  } catch (error) {
    console.error(error);
  }
}

const modalPreguntas = document.getElementById("modalPreguntas");
const preguntasContainer = document.getElementById("preguntasContainer");
const modalTitulo = document.getElementById("modalTituloCuestionario");
const modalInfo = document.getElementById("modalInfoCuestionario");
const btnCerrarPreguntas = document.getElementById("btnCerrarPreguntas");

async function verPreguntas(id) {
  try {
    const data = await fetchJson(`${API}/api/cuestionarios/admin/${id}/preguntas`);

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }

    const { cuestionario, preguntas } = data;
    modalTitulo.textContent = cuestionario.titulo;
    modalInfo.textContent = `${cuestionario.materia} • ${cuestionario.nombre_asesor}`;

    preguntasContainer.innerHTML = (preguntas || []).map((pregunta, index) => `
      <article class="pregunta-preview-card">
        <div class="pregunta-head"><span class="pregunta-number">Pregunta ${index + 1}</span></div>
        <h4 class="pregunta-text">${escaparHTML(pregunta.pregunta)}</h4>
        <div class="opciones-preview">
          ${crearOpcion("A", pregunta.opcion_a, pregunta.respuesta_correcta)}
          ${crearOpcion("B", pregunta.opcion_b, pregunta.respuesta_correcta)}
          ${crearOpcion("C", pregunta.opcion_c, pregunta.respuesta_correcta)}
          ${crearOpcion("D", pregunta.opcion_d, pregunta.respuesta_correcta)}
        </div>
      </article>
    `).join("");

    modalPreguntas.classList.remove("hidden");
  } catch (error) {
    console.error(error);
  }
}

function crearOpcion(letra, texto, correcta) {
  return `
    <div class="opcion-preview ${letra === correcta ? "correcta" : ""}">
      <strong>${letra}</strong> ${escaparHTML(texto)}
    </div>
  `;
}

cuestionariosGrid?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) return;

  if (boton.dataset.action === "questions") verPreguntas(boton.dataset.id);
  if (boton.dataset.action === "approve") aprobarCuestionario(boton.dataset.id);
  if (boton.dataset.action === "reject") rechazarCuestionario(boton.dataset.id);
});

paginationContainer?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-page]");
  if (!boton || boton.disabled) return;
  cambiarPagina(boton.dataset.page);
});

btnCerrarPreguntas?.addEventListener("click", () => {
  modalPreguntas.classList.add("hidden");
});

buscarInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") reiniciarYCargar();
});

buscarInput?.addEventListener("input", () => {
  clearTimeout(buscarInput._timer);
  buscarInput._timer = setTimeout(reiniciarYCargar, 450);
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    estadoActual = tab.dataset.estado || "";
    reiniciarYCargar();
  });
});

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/pages/login.html";
});

cargarCuestionarios();
