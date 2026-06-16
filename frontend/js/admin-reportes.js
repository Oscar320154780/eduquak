const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

const reportesGrid = document.getElementById("reportesGrid");
const buscarInput = document.getElementById("buscarReporte");
const fechaInicioInput = document.getElementById("fechaInicioReporte");
const fechaFinInput = document.getElementById("fechaFinReporte");
const btnFiltrarFechas = document.getElementById("btnFiltrarFechas");
const btnLimpiarFechas = document.getElementById("btnLimpiarFechas");
const tabs = document.querySelectorAll(".tab-btn");
const paginationContainer = document.getElementById("reportesPagination");

const modalReporte = document.getElementById("modalReporte");
const modalBody = document.getElementById("modalBody");
const modalTitulo = document.getElementById("modalTitulo");
const modalSubtitulo = document.getElementById("modalSubtitulo");
const btnCerrarModal = document.getElementById("btnCerrarModal");

const modalEvidencia = document.getElementById("modalEvidencia");
const iframeEvidencia = document.getElementById("iframeEvidencia");
const imagenEvidencia = document.getElementById("imagenEvidencia");
const btnCerrarEvidencia = document.getElementById("btnCerrarEvidencia");
const btnAbrirEvidencia = document.getElementById("btnAbrirEvidencia");
const btnDescargarEvidencia = document.getElementById("btnDescargarEvidencia");

let reportes = [];
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

function construirUrlReportes() {
  const params = new URLSearchParams();
  params.set("page", String(paginaActual));
  params.set("limit", String(limitePorPagina));

  const search = buscarInput.value.trim();
  const fechaInicio = fechaInicioInput?.value || "";
  const fechaFin = fechaFinInput?.value || "";

  if (search) params.set("search", search);
  if (estadoActual) params.set("estado", estadoActual);
  if (fechaInicio) params.set("fechaInicio", fechaInicio);
  if (fechaFin) params.set("fechaFin", fechaFin);

  return `${API}/api/admin/reportes?${params.toString()}`;
}

async function cargarReportes() {
  try {
    reportesGrid.innerHTML = `
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
      <div class="usuario-skeleton"></div>
    `;

    if (paginationContainer) paginationContainer.innerHTML = "";

    const data = await fetchJson(construirUrlReportes());

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message || "No se pudieron cargar reportes" });
      return;
    }

    reportes = data.reportes || [];
    paginacionActual = data.pagination || paginacionActual;

    actualizarKPIs(data.resumen || {});
    renderReportes();
    renderPaginacion();
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al cargar reportes" });
  }
}

function actualizarKPIs(resumen) {
  document.getElementById("kpiTotal").textContent = resumen.total || 0;
  document.getElementById("kpiPendientes").textContent = resumen.pendientes || 0;
  document.getElementById("kpiRevisados").textContent = resumen.revisados || 0;
  document.getElementById("kpiResueltos").textContent = resumen.resueltos || 0;
}

function renderReportes() {
  if (reportes.length === 0) {
    reportesGrid.innerHTML = `<div class="empty-state">No se encontraron reportes.</div>`;
    return;
  }

  reportesGrid.innerHTML = reportes.map((reporte) => {
    const prioridad = obtenerPrioridad(reporte.total_reportes);
    const tieneSancionAsesor = Boolean(reporte.sancion_asesor_id);
    const tieneSancionAlumno = Boolean(reporte.sancion_alumno_id);

    return `
      <article class="reporte-card">
        <div class="reporte-top">
          <div>
            <span class="prioridad-badge ${prioridad.class}">${prioridad.label}</span>
            <h3 class="reporte-title">${escaparHTML(reporte.motivo)}</h3>
          </div>
          <span class="estado-badge ${escaparHTML(reporte.estado)}">${capitalizar(reporte.estado)}</span>
        </div>

        <p class="reporte-description">${escaparHTML(reporte.descripcion || "Sin descripción")}</p>

        <div class="reporte-meta">
          <span>Alumno: ${escaparHTML(reporte.nombre_alumno)}</span>
          <span>Asesor: ${escaparHTML(reporte.nombre_asesor)}</span>
          <span>Reporte: ${formatearFecha(reporte.fecha_reporte)}</span>
        </div>

        <div class="reportes-total">Total reportes asesor: <strong>${reporte.total_reportes}</strong></div>

        ${(tieneSancionAsesor || tieneSancionAlumno) ? `
          <div class="sancion-mini-alert">
            ${tieneSancionAlumno ? `<span>Alumno sancionado hasta ${formatearFechaHora(reporte.sancion_alumno_hasta)}</span>` : ""}
            ${tieneSancionAsesor ? `<span>Asesor sancionado hasta ${formatearFechaHora(reporte.sancion_asesor_hasta)}</span>` : ""}
          </div>
        ` : ""}

        <div class="reporte-actions">
          <button class="btn outline" data-action="detail" data-id="${reporte.id_reporte}">Ver detalle</button>
          ${reporte.evidencia_url ? `<button class="btn primary" data-action="evidence" data-url="${escaparHTML(reporte.evidencia_url)}" data-type="${escaparHTML(reporte.tipo_evidencia || "")}">Ver evidencia</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderPaginacion() {
  if (!paginationContainer) return;

  const { page, total, totalPages, limit } = paginacionActual;
  const inicio = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const fin = Math.min(page * limit, total);

  paginationContainer.innerHTML = `
    <div class="pagination-info">Mostrando <strong>${inicio}-${fin}</strong> de <strong>${total}</strong> reportes</div>
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
  cargarReportes();
}

function reiniciarYCargar() {
  paginaActual = 1;
  cargarReportes();
}

function validarRangoFechas() {
  const fechaInicio = fechaInicioInput?.value || "";
  const fechaFin = fechaFinInput?.value || "";

  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    Swal.fire({
      icon: "warning",
      title: "Rango inválido",
      text: "La fecha inicial no puede ser mayor que la fecha final"
    });
    return false;
  }

  return true;
}

function aplicarFiltroFechas() {
  if (!validarRangoFechas()) return;
  reiniciarYCargar();
}

function limpiarFiltroFechas() {
  if (fechaInicioInput) fechaInicioInput.value = "";
  if (fechaFinInput) fechaFinInput.value = "";
  reiniciarYCargar();
}

function obtenerPrioridad(total) {
  const numero = Number(total || 0);
  if (numero >= 4) return { label: "Alta", class: "alta" };
  if (numero >= 2) return { label: "Media", class: "media" };
  return { label: "Baja", class: "baja" };
}

function estadoOrdenReporte(estado) {
  const value = String(estado || "pendiente").toLowerCase();
  if (value === "resuelto") return 3;
  if (value === "revisado") return 2;
  return 1;
}

function renderTimelineReporte(reporte) {
  const orden = estadoOrdenReporte(reporte.estado);

  const pasos = [
    {
      orden: 1,
      titulo: "Reporte creado",
      texto: formatearFechaHora(reporte.fecha_reporte),
      clase: "done"
    },
    {
      orden: 2,
      titulo: "Revisado",
      texto: orden >= 2 ? formatearFechaHora(reporte.fecha_revisado) : "Pendiente de revisión.",
      clase: orden >= 2 ? "done" : "pending"
    },
    {
      orden: 3,
      titulo: "Resuelto",
      texto: orden >= 3 ? formatearFechaHora(reporte.fecha_resuelto) : "Aún no se ha resuelto.",
      clase: orden >= 3 ? "done" : "pending"
    }
  ];

  return `
    <div class="timeline-box timeline-box-steps">
      ${pasos.map((paso) => `
        <div class="timeline-item ${paso.clase}">
          <div class="timeline-dot ${paso.clase === "done" ? "active" : ""}"></div>
          <div>
            <strong>${paso.titulo}</strong>
            <p>${paso.texto}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBotonesEstado(reporte) {
  const estadoActualReporte = String(reporte.estado || "pendiente").toLowerCase();

  const opciones = [
    { estado: "pendiente", texto: "Pendiente", clase: "warning" },
    { estado: "revisado", texto: "Revisado", clase: "info" },
    { estado: "resuelto", texto: "Resuelto", clase: "success" }
  ];

  const botones = opciones
    .filter((opcion) => opcion.estado !== estadoActualReporte)
    .map((opcion) => `
      <button class="btn ${opcion.clase}" data-estado-update="${opcion.estado}" data-id="${reporte.id_reporte}">
        ${opcion.texto}
      </button>
    `)
    .join("");

  return botones || `<p class="info-line">Este reporte ya está en el estado seleccionado.</p>`;
}

function renderSancionesActivas(reporte) {
  const sanciones = [];

  if (reporte.sancion_alumno_id) {
    sanciones.push(`
      <div class="sancion-activa-box">
        <strong>Alumno sancionado</strong>
        <span>Hasta: ${formatearFechaHora(reporte.sancion_alumno_hasta)}</span>
        <p>${escaparHTML(reporte.sancion_alumno_motivo || "Sin motivo registrado")}</p>
      </div>
    `);
  }

  if (reporte.sancion_asesor_id) {
    sanciones.push(`
      <div class="sancion-activa-box">
        <strong>Asesor sancionado</strong>
        <span>Hasta: ${formatearFechaHora(reporte.sancion_asesor_hasta)}</span>
        <p>${escaparHTML(reporte.sancion_asesor_motivo || "Sin motivo registrado")}</p>
      </div>
    `);
  }

  return sanciones.length
    ? `<div class="sanciones-activas-grid">${sanciones.join("")}</div>`
    : "";
}

function renderPanelSancion(reporte) {
  return `
    <section class="sancion-panel">
      <div class="sancion-panel-head">
        <div>
          <h4>Aplicar sanción</h4>
          <p>Bloquea temporalmente al usuario responsable. Se mostrará una alerta roja en su panel.</p>
        </div>
      </div>

      <div class="sancion-form-grid">
        <label>
          Usuario
          <select id="sancionObjetivo">
            <option value="asesor">Asesor: ${escaparHTML(reporte.nombre_asesor)}</option>
            <option value="alumno">Alumno: ${escaparHTML(reporte.nombre_alumno)}</option>
          </select>
        </label>

        <label>
          Duración
          <select id="sancionDias">
            <option value="1">1 día</option>
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="15">15 días</option>
            <option value="30">30 días</option>
          </select>
        </label>
      </div>

      <label class="sancion-motivo-label">
        Motivo de sanción
        <textarea id="sancionMotivo" placeholder="Ej. Inasistencia sin aviso, mal uso del chat, conducta inadecuada..." rows="3"></textarea>
      </label>

      <div class="estado-actions">
        <button class="btn danger" data-sancionar="${reporte.id_reporte}">Aplicar sanción</button>
      </div>
    </section>
  `;
}

function verDetalle(id) {
  const reporte = reportes.find((r) => Number(r.id_reporte) === Number(id));
  if (!reporte) return;

  modalTitulo.textContent = reporte.motivo;
  modalSubtitulo.innerHTML = `${escaparHTML(reporte.nombre_alumno)} • ${escaparHTML(reporte.nombre_asesor)}`;

  modalBody.innerHTML = `
    <div class="detalle-grid">
      <div class="detalle-card"><span class="detalle-label">Alumno</span><strong>${escaparHTML(reporte.nombre_alumno)}</strong><small>${escaparHTML(reporte.correo_alumno)}</small></div>
      <div class="detalle-card"><span class="detalle-label">Asesor</span><strong>${escaparHTML(reporte.nombre_asesor)}</strong><small>${escaparHTML(reporte.correo_asesor)}</small></div>
      <div class="detalle-card"><span class="detalle-label">Fecha asesoría</span><strong>${formatearFecha(reporte.fecha_asesoria)}</strong></div>
      <div class="detalle-card"><span class="detalle-label">Hora</span><strong>${escaparHTML(reporte.hora_asesoria || "-")}</strong></div>
    </div>

    ${renderTimelineReporte(reporte)}

    ${renderSancionesActivas(reporte)}

    <div class="descripcion-box"><h4>Descripción</h4><p>${escaparHTML(reporte.descripcion || "-")}</p></div>

    <section class="seguimiento-panel">
      <h4>Seguimiento del reporte</h4>
      <p class="info-line">Cambia el estado sin perder el caso. Si el reporte cambia de apartado, la vista vuelve a “Todos” para que puedas seguirlo.</p>
      <div class="estado-actions">
        ${renderBotonesEstado(reporte)}
      </div>
    </section>

    ${renderPanelSancion(reporte)}
  `;

  modalReporte.classList.remove("hidden");
}

async function actualizarEstado(id, estado) {
  try {
    const data = await fetchJson(`${API}/api/admin/reportes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado })
    });

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "Error", text: data.message });
      return;
    }

    Swal.fire({ icon: "success", title: "Estado actualizado", timer: 1400, showConfirmButton: false });
    modalReporte.classList.add("hidden");

    if (estadoActual) {
      estadoActual = "";
      tabs.forEach((tab) => tab.classList.toggle("active", !tab.dataset.estado));
    }

    paginaActual = 1;
    cargarReportes();
  } catch (error) {
    console.error(error);
  }
}

async function aplicarSancion(idReporte) {
  const objetivo = document.getElementById("sancionObjetivo")?.value || "asesor";
  const dias = document.getElementById("sancionDias")?.value || "1";
  const motivo = document.getElementById("sancionMotivo")?.value.trim() || "";

  if (!motivo) {
    Swal.fire({ icon: "warning", title: "Motivo requerido", text: "Escribe el motivo de la sanción." });
    return;
  }

  const confirmacion = await Swal.fire({
    icon: "warning",
    title: "¿Aplicar sanción?",
    text: `Se bloqueará temporalmente al ${objetivo} durante ${dias} día(s) completo(s), desde este momento hasta la misma hora del último día. El reporte se marcará como resuelto.`,
    showCancelButton: true,
    confirmButtonText: "Sí, aplicar",
    cancelButtonText: "Cancelar"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    const data = await fetchJson(`${API}/api/admin/reportes/${idReporte}/sancion`, {
      method: "POST",
      body: JSON.stringify({ objetivo, dias, motivo })
    });

    if (!data.ok) {
      Swal.fire({ icon: "error", title: "No se pudo sancionar", text: data.message || "Error al aplicar sanción" });
      return;
    }

    Swal.fire({ icon: "success", title: "Sanción aplicada", text: "El usuario fue bloqueado por días completos y el reporte se marcó como resuelto." });
    modalReporte.classList.add("hidden");
    estadoActual = "";
    tabs.forEach((tab) => tab.classList.toggle("active", !tab.dataset.estado));
    paginaActual = 1;
    cargarReportes();
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al aplicar sanción" });
  }
}

function verEvidencia(url, tipo) {
  const fullUrl = construirArchivoUrl(url);

  btnAbrirEvidencia.href = fullUrl;
  btnDescargarEvidencia.href = fullUrl;
  iframeEvidencia.classList.add("hidden");
  imagenEvidencia.classList.add("hidden");

  if (tipo && tipo.startsWith("image")) {
    imagenEvidencia.src = fullUrl;
    imagenEvidencia.classList.remove("hidden");
  } else {
    iframeEvidencia.src = fullUrl;
    iframeEvidencia.classList.remove("hidden");
  }

  modalEvidencia.classList.remove("hidden");
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const texto = String(fecha);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return texto;
  }

  return fechaObj.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearFechaHora(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return String(fecha);
  }

  return fechaObj.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function capitalizar(texto) {
  texto = String(texto || "-");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

reportesGrid?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) return;

  if (boton.dataset.action === "detail") verDetalle(boton.dataset.id);
  if (boton.dataset.action === "evidence") verEvidencia(boton.dataset.url || "", boton.dataset.type || "");
});

paginationContainer?.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-page]");
  if (!boton || boton.disabled) return;
  cambiarPagina(boton.dataset.page);
});

modalBody?.addEventListener("click", (event) => {
  const botonEstado = event.target.closest("button[data-estado-update]");
  if (botonEstado) {
    actualizarEstado(botonEstado.dataset.id, botonEstado.dataset.estadoUpdate);
    return;
  }

  const botonSancion = event.target.closest("button[data-sancionar]");
  if (botonSancion) {
    aplicarSancion(botonSancion.dataset.sancionar);
  }
});

buscarInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") reiniciarYCargar();
});

buscarInput?.addEventListener("input", () => {
  clearTimeout(buscarInput._timer);
  buscarInput._timer = setTimeout(reiniciarYCargar, 450);
});

fechaInicioInput?.addEventListener("change", aplicarFiltroFechas);
fechaFinInput?.addEventListener("change", aplicarFiltroFechas);
btnFiltrarFechas?.addEventListener("click", aplicarFiltroFechas);
btnLimpiarFechas?.addEventListener("click", limpiarFiltroFechas);

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    estadoActual = tab.dataset.estado || "";
    reiniciarYCargar();
  });
});

btnCerrarModal?.addEventListener("click", () => {
  modalReporte.classList.add("hidden");
});

btnCerrarEvidencia?.addEventListener("click", () => {
  modalEvidencia.classList.add("hidden");
  iframeEvidencia.src = "";
  imagenEvidencia.src = "";
});

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/pages/login.html";
});

cargarReportes();
