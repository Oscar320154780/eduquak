const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

const materialesGrid = document.getElementById("materialesGrid");
const buscarInput = document.getElementById("buscarMaterial");
const tabs = document.querySelectorAll(".tab-btn");
const paginationContainer = document.getElementById("materialesPagination");

const modalPdf = document.getElementById("modalPdf");
const pdfViewer = document.getElementById("pdfViewer");
const btnCerrarPdf = document.getElementById("btnCerrarPdf");
const btnAbrirPdf = document.getElementById("btnAbrirPdf");
const btnDescargarPdf = document.getElementById("btnDescargarPdf");

let materiales = [];
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

function construirUrlMateriales() {
  const params = new URLSearchParams();
  params.set("page", String(paginaActual));
  params.set("limit", String(limitePorPagina));

  const search = buscarInput.value.trim();
  if (search) params.set("search", search);
  if (estadoActual) params.set("estado", estadoActual);

  return `${API}/api/materiales/admin/todos?${params.toString()}`;
}

async function cargarMateriales() {
  try {
    materialesGrid.innerHTML = `
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
    `;

    if (paginationContainer) paginationContainer.innerHTML = "";

    const data = await fetchJson(construirUrlMateriales());

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message || "No se pudieron cargar materiales" });
      return;
    }

    materiales = data.materiales || [];
    paginacionActual = data.pagination || paginacionActual;

    actualizarKPIs(data.resumen || {});
    renderMateriales();
    renderPaginacion();
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al cargar materiales" });
  }
}

function actualizarKPIs(resumen) {
  document.getElementById("totalMateriales").textContent = resumen.total ?? 0;
  document.getElementById("totalPendientes").textContent = resumen.pendientes ?? 0;
  document.getElementById("totalAprobados").textContent = resumen.aprobados ?? 0;
  document.getElementById("totalRechazados").textContent = resumen.rechazados ?? 0;
}

function renderMateriales() {
  if (materiales.length === 0) {
    materialesGrid.innerHTML = `<div class="empty-state">No se encontraron materiales.</div>`;
    return;
  }

  materialesGrid.innerHTML = materiales.map((material) => `
    <article class="material-card">
      <div class="material-top">
        <div>
          <span class="material-badge">${escaparHTML(material.materia)}</span>
          <h3 class="material-title">${escaparHTML(material.titulo)}</h3>
        </div>
        <span class="estado-badge ${escaparHTML(material.estado_revision)}">${formatEstado(material.estado_revision)}</span>
      </div>

      <p class="material-description">${escaparHTML(material.descripcion || "Sin descripción")}</p>

      <div class="material-meta">
        <span>👤 ${escaparHTML(material.nombre_asesor)}</span>
        <span>Fecha: ${formatFecha(material.fecha_subida)}</span>
      </div>

      ${material.motivo_revision ? `<div class="motivo-box"><strong>Motivo:</strong> ${escaparHTML(material.motivo_revision)}</div>` : ""}

      <div class="material-actions">
        <button class="btn outline" data-action="pdf" data-url="${escaparHTML(material.archivo_url)}">Ver PDF</button>
        <button class="btn success" data-action="approve" data-id="${material.id_material}">Aprobar</button>
        <button class="btn danger" data-action="reject" data-id="${material.id_material}">Rechazar</button>
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
    <div class="pagination-info">Mostrando <strong>${inicio}-${fin}</strong> de <strong>${total}</strong> materiales</div>
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
  cargarMateriales();
}

function reiniciarYCargar() {
  paginaActual = 1;
  cargarMateriales();
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

async function aprobarMaterial(id) {
  const result = await Swal.fire({
    title: "¿Aprobar material?",
    text: "El material será visible para alumnos.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, aprobar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  try {
    const data = await fetchJson(`${API}/api/materiales/admin/${id}/approve`, { method: "PUT" });
    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }
    Swal.fire({ icon: "success", title: "Material aprobado", timer: 1600, showConfirmButton: false });
    cargarMateriales();
  } catch (error) {
    console.error(error);
  }
}

async function rechazarMaterial(id) {
  const result = await Swal.fire({
    title: "Rechazar material",
    input: "textarea",
    inputLabel: "Motivo del rechazo",
    inputPlaceholder: "Ej. Archivo incorrecto...",
    showCancelButton: true,
    confirmButtonText: "Rechazar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  try {
    const data = await fetchJson(`${API}/api/materiales/admin/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ motivo_revision: result.value })
    });
    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }
    Swal.fire({ icon: "success", title: "Material rechazado", timer: 1600, showConfirmButton: false });
    cargarMateriales();
  } catch (error) {
    console.error(error);
  }
}

function abrirPdf(url) {
  const fullUrl = construirArchivoUrl(url);
  if (!fullUrl) return;

  pdfViewer.src = fullUrl;
  btnAbrirPdf.href = fullUrl;
  btnDescargarPdf.href = fullUrl;
  modalPdf.classList.remove("hidden");
}

materialesGrid?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) return;

  if (boton.dataset.action === "pdf") abrirPdf(boton.dataset.url || "");
  if (boton.dataset.action === "approve") aprobarMaterial(boton.dataset.id);
  if (boton.dataset.action === "reject") rechazarMaterial(boton.dataset.id);
});

paginationContainer?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-page]");
  if (!boton || boton.disabled) return;
  cambiarPagina(boton.dataset.page);
});

btnCerrarPdf?.addEventListener("click", () => {
  modalPdf.classList.add("hidden");
  pdfViewer.src = "";
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

cargarMateriales();
