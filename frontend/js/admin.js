console.clear();

window.addEventListener("error", (e) => {
  console.error("ERROR GLOBAL:", e.error);
});

// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

let chartUsuariosRolInstance = null;
let chartAdminAsesoriasInstance = null;
let chartAdminContenidoInstance = null;
let chartValidacionUsuariosInstance = null;
let chartTopAsesoresInstance = null;

let rechazoContexto = {
  tipo: null,
  id: null,
  refreshFn: null
};

// Se encarga de guardar text en esta pantalla y mantiene conectada la vista con el backend.
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Se encarga de guardar admin message en esta pantalla y mantiene conectada la vista con el backend.
function setAdminMessage(text) {
  const el = document.getElementById("mensajeAdmin");
  if (el) el.textContent = text;
}

// Se encarga de formatear estado revision en esta pantalla y mantiene conectada la vista con el backend.
function formatearEstadoRevision(estado) {
  if (estado === "pendiente_revision") return "pendiente";
  return estado || "-";
}

// Se encarga de formatear fecha en esta pantalla y mantiene conectada la vista con el backend.
function formatearFecha(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;

  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Se encarga de estado class en esta pantalla y mantiene conectada la vista con el backend.
function estadoClass(estado) {

  const value =
    String(estado || "")
      .toLowerCase();

  if (
    value.includes("verificado") ||
    value.includes("aprobado") ||
    value.includes("aceptada")
  ) {
    return "success";
  }

  if (
    value.includes("rechazado")
  ) {
    return "danger";
  }

  // REPORTES

  if (value === "pendiente") {
    return "pending";
  }

  if (value === "revisado") {
    return "review";
  }

  if (value === "resuelto") {
    return "resolved";
  }

  return "pending";
}

// Se encarga de mostrar empty en esta pantalla y mantiene conectada la vista con el backend.
function renderEmpty(containerId, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="empty-state">${text}</div>`;
}

// Se encarga de es imagen en esta pantalla y mantiene conectada la vista con el backend.
function esImagen(url = "") {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

// Se encarga de es pdf en esta pantalla y mantiene conectada la vista con el backend.
function esPdf(url = "") {
  return /\.pdf$/i.test(url);
}

// Se encarga de mostrar preview archivo en esta pantalla y mantiene conectada la vista con el backend.
function renderPreviewArchivo(url, textoBoton = "Abrir archivo") {
  if (!url) return "";

  if (esImagen(url)) {
    return `
      <div class="admin-preview">
        <img src="${url}" alt="Vista previa del archivo" class="admin-preview-image">
        <div class="admin-actions">
          <a href="${url}" target="_blank" class="btn outline">${textoBoton}</a>
        </div>
      </div>
    `;
  }

  if (esPdf(url)) {
    return `
      <div class="admin-preview admin-preview-pdf">
        <div class="admin-note">
          <strong>PDF disponible para revisión</strong><br>
          Puedes abrirlo en una pestaña nueva.
        </div>
        <div class="admin-actions">
          <a href="${url}" target="_blank" class="btn outline">Abrir PDF</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="admin-preview">
      <div class="admin-note">
        Archivo disponible para revisión.
      </div>
      <div class="admin-actions">
        <a href="${url}" target="_blank" class="btn outline">${textoBoton}</a>
      </div>
    </div>
  `;
}

// Se encarga de fetch json en esta pantalla y mantiene conectada la vista con el backend.
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  return { res, data };
}

/* MODAL RECHAZO */
function abrirModalRechazo({ tipo, id, titulo, descripcion, refreshFn }) {
  rechazoContexto = { tipo, id, refreshFn };

  const modal = document.getElementById("modalRechazo");
  const modalTitulo = document.getElementById("modalTitulo");
  const modalDescripcion = document.getElementById("modalDescripcion");
  const modalMotivo = document.getElementById("modalMotivo");

  if (modalTitulo) modalTitulo.textContent = titulo;
  if (modalDescripcion) modalDescripcion.textContent = descripcion;
  if (modalMotivo) modalMotivo.value = "";

  modal?.classList.remove("hidden");
  modalMotivo?.focus();
}

// Se encarga de cerrar modal rechazo en esta pantalla y mantiene conectada la vista con el backend.
function cerrarModalRechazo() {
  const modal = document.getElementById("modalRechazo");
  const modalMotivo = document.getElementById("modalMotivo");

  modal?.classList.add("hidden");
  if (modalMotivo) modalMotivo.value = "";

  rechazoContexto = {
    tipo: null,
    id: null,
    refreshFn: null
  };
}

// Se encarga de confirmar rechazo desde modal en esta pantalla y mantiene conectada la vista con el backend.
async function confirmarRechazoDesdeModal() {
  const modalMotivo = document.getElementById("modalMotivo");
  const motivo = modalMotivo?.value.trim() || "";
  const refreshFn = rechazoContexto.refreshFn;

  if (!rechazoContexto.tipo || !rechazoContexto.id) {
    cerrarModalRechazo();
    return;
  }

  try {
    let endpoint = "";

    if (rechazoContexto.tipo === "usuario") {
      endpoint = `${API}/api/admin/users/${rechazoContexto.id}/reject`;
    } else if (rechazoContexto.tipo === "material") {
      endpoint = `${API}/api/materiales/admin/${rechazoContexto.id}/reject`;
    } else if (rechazoContexto.tipo === "cuestionario") {
      endpoint = `${API}/api/cuestionarios/admin/${rechazoContexto.id}/reject`;
    }

    const { data } = await fetchJson(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ motivo_revision: motivo })
    });

    setAdminMessage(data.message || "Respuesta recibida.");

    if (data.ok) {
      cerrarModalRechazo();
      if (typeof refreshFn === "function") {
        await refreshFn();
      }
    }
  } catch (error) {
    console.error("Error al rechazar elemento:", error);
    setAdminMessage("Ocurrió un error al rechazar el elemento.");
  }
}

// Se encarga de inicializar modal en esta pantalla y mantiene conectada la vista con el backend.
function inicializarModal() {
  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("btnCerrarModal")?.addEventListener("click", cerrarModalRechazo);
  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("btnCancelarModal")?.addEventListener("click", cerrarModalRechazo);
  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("btnConfirmarRechazo")?.addEventListener("click", confirmarRechazoDesdeModal);

  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("modalRechazo")?.addEventListener("click", (e) => {
    if (e.target.id === "modalRechazo") {
      cerrarModalRechazo();
    }
  });

  // Este listener responde al evento "keydown" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.addEventListener("keydown", (e) => {
    const modalRechazo = document.getElementById("modalRechazo");
    const modalCuestionario = document.getElementById("modalCuestionario");

    if (e.key === "Escape") {
      if (modalRechazo && !modalRechazo.classList.contains("hidden")) {
        cerrarModalRechazo();
      }
      if (modalCuestionario && !modalCuestionario.classList.contains("hidden")) {
        cerrarModalCuestionario();
      }
    }
  });
}

/* MODAL CUESTIONARIO */
function abrirModalCuestionario() {
  document.getElementById("modalCuestionario")?.classList.remove("hidden");
}

// Se encarga de cerrar modal cuestionario en esta pantalla y mantiene conectada la vista con el backend.
function cerrarModalCuestionario() {
  document.getElementById("modalCuestionario")?.classList.add("hidden");
  const info = document.getElementById("modalCuestionarioInfo");
  const preguntas = document.getElementById("modalCuestionarioPreguntas");
  if (info) info.innerHTML = "";
  if (preguntas) preguntas.innerHTML = "";
}

// Se encarga de inicializar modal cuestionario en esta pantalla y mantiene conectada la vista con el backend.
function inicializarModalCuestionario() {
  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("btnCerrarModalCuestionario")?.addEventListener("click", cerrarModalCuestionario);
  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("btnCerrarRevisionCuestionario")?.addEventListener("click", cerrarModalCuestionario);

  // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
  document.getElementById("modalCuestionario")?.addEventListener("click", (e) => {
    if (e.target.id === "modalCuestionario") {
      cerrarModalCuestionario();
    }
  });
}

// Se encarga de ver preguntas cuestionario admin en esta pantalla y mantiene conectada la vista con el backend.
async function verPreguntasCuestionarioAdmin(idCuestionario) {
  try {
    const info = document.getElementById("modalCuestionarioInfo");
    const preguntasBox = document.getElementById("modalCuestionarioPreguntas");
    const titulo = document.getElementById("modalCuestionarioTitulo");

    if (info) info.innerHTML = "<div class='admin-note'>Cargando información del cuestionario...</div>";
    if (preguntasBox) preguntasBox.innerHTML = "";

    abrirModalCuestionario();

    const { data } = await fetchJson(`${API}/api/cuestionarios/admin/${idCuestionario}/preguntas`);

    if (!data.ok) {
      if (info) {
        info.innerHTML = `<div class="admin-note">${data.message || "No se pudo cargar el cuestionario."}</div>`;
      }
      return;
    }

    const cuestionario = data.cuestionario;
    const preguntas = data.preguntas || [];

    if (titulo) {
      titulo.textContent = `Revisión: ${cuestionario.titulo}`;
    }

    if (info) {
      info.innerHTML = `
        <p><strong>Materia:</strong> ${cuestionario.materia || "-"}</p>
        <p><strong>Asesor:</strong> ${cuestionario.nombre_asesor || "-"} · ${cuestionario.correo_asesor || "-"}</p>
        <p><strong>Estado:</strong> ${formatearEstadoRevision(cuestionario.estado_revision)}</p>
        <p><strong>Fecha:</strong> ${formatearFecha(cuestionario.fecha_creacion)}</p>
        ${cuestionario.descripcion ? `<p><strong>Descripción:</strong> ${cuestionario.descripcion}</p>` : ""}
      `;
    }

    if (!preguntas.length) {
      if (preguntasBox) {
        preguntasBox.innerHTML = `<div class="empty-state">Este cuestionario todavía no tiene preguntas.</div>`;
      }
      return;
    }

    if (preguntasBox) {
      preguntasBox.innerHTML = "";
      preguntas.forEach((p, index) => {
        const card = document.createElement("article");
        card.className = "pregunta-admin-card";

        card.innerHTML = `
          <div class="pregunta-admin-head">
            <h4>Pregunta ${index + 1}</h4>
            <span class="respuesta-pill">Correcta: ${p.respuesta_correcta}</span>
          </div>

          <div class="pregunta-admin-texto">
            ${p.pregunta}
          </div>

          <div class="opciones-admin-grid">
            <div class="opcion-admin ${p.respuesta_correcta === "A" ? "correcta" : ""}">
              <strong>A:</strong> ${p.opcion_a}
            </div>
            <div class="opcion-admin ${p.respuesta_correcta === "B" ? "correcta" : ""}">
              <strong>B:</strong> ${p.opcion_b}
            </div>
            <div class="opcion-admin ${p.respuesta_correcta === "C" ? "correcta" : ""}">
              <strong>C:</strong> ${p.opcion_c}
            </div>
            <div class="opcion-admin ${p.respuesta_correcta === "D" ? "correcta" : ""}">
              <strong>D:</strong> ${p.opcion_d}
            </div>
          </div>
        `;

        preguntasBox.appendChild(card);
      });
    }
  } catch (error) {
    console.error("Error al ver preguntas del cuestionario:", error);
    const info = document.getElementById("modalCuestionarioInfo");
    if (info) {
      info.innerHTML = `<div class="admin-note">Error al cargar las preguntas del cuestionario.</div>`;
    }
  }
}

// Se encarga de cargar perfil admin en esta pantalla y mantiene conectada la vista con el backend.
async function cargarPerfilAdmin() {
  try {
    const { data } = await fetchJson(`${API}/api/users/me`);

    if (!data.ok) {
      setAdminMessage(data.message || "No se pudo cargar el perfil del administrador.");
      return;
    }

    const user = data.user;

    if (user.rol !== "admin") {
      setAdminMessage("Esta página es solo para administradores.");
      window.location.href = "/pages/login.html";
      return;
    }

    setText("nombre", user.nombre || "-");
    setText("correo", user.correo || "-");
    setText("rol", user.rol || "-");
    setText("estado", user.estado_validacion || "-");

    setAdminMessage(
      "Desde este panel puedes revisar usuarios, aprobar contenido y monitorear el estado general de EduQuak."
    );
  } catch (error) {
    console.error("Error al cargar perfil admin:", error);
    setAdminMessage("Error al cargar el perfil del administrador.");
  }
}

// Se encarga de aprobar usuario directo en esta pantalla y mantiene conectada la vista con el backend.
async function aprobarUsuarioDirecto(id) {
  try {
    const { data } = await fetchJson(`${API}/api/admin/users/${id}/approve`, {
      method: "PUT"
    });

    setAdminMessage(data.message || "Respuesta recibida.");

    if (data.ok) {
      await verUsuarios();
    }
  } catch (error) {
    console.error("Error al aprobar usuario:", error);
    setAdminMessage("Ocurrió un error al aprobar el usuario.");
  }
}

// Se encarga de rechazar usuario directo en esta pantalla y mantiene conectada la vista con el backend.
function rechazarUsuarioDirecto(id, nombre) {
  abrirModalRechazo({
    tipo: "usuario",
    id,
    titulo: "Rechazar usuario",
    descripcion: `Vas a rechazar al usuario "${nombre}". Puedes escribir un motivo si lo deseas.`,
    refreshFn: verUsuarios
  });
}

// Se encarga de ver usuarios en esta pantalla y mantiene conectada la vista con el backend.
async function verUsuarios() {
  try {
    const { data } = await fetchJson(`${API}/api/admin/users`);

    const contenedor = document.getElementById("resultadoAdmin");
    if (!contenedor) return;

    if (!data.ok) {
      renderEmpty("resultadoAdmin", data.message || "No se pudieron cargar los usuarios.");
      return;
    }

    if (!data.users || data.users.length === 0) {
      renderEmpty("resultadoAdmin", "No hay usuarios registrados.");
      return;
    }

    contenedor.innerHTML = "";

    data.users.forEach((u) => {
      const documentoCompleto = u.documento_url ? `${API}${u.documento_url}` : "";
      const estado = u.estado_validacion || "-";

      const card = document.createElement("article");
      card.className = "admin-card";

      card.innerHTML = `
        <div class="admin-card-header">
          <div>
            <h3>${u.nombre} <span class="role-badge role-${String(u.rol || "").toLowerCase()} inline">${u.rol || "usuario"}</span></h3>
            <p class="admin-muted">${u.correo}</p>
          </div>
          <span class="status-pill ${estadoClass(estado)}">${estado}</span>
        </div>

        <div class="admin-meta">
          <p><strong>ID:</strong> ${u.id_usuario}</p>
          <p><strong>Rol:</strong> <span class="role-badge role-${String(u.rol || "").toLowerCase()} inline">${u.rol || "-"}</span></p>
          <p><strong>Badge:</strong> ${u.badge_verificacion || "-"}</p>
          <p><strong>Institución:</strong> ${u.institucion || "-"}</p>
          <p><strong>Teléfono:</strong> ${u.telefono || "-"}</p>
          ${u.especialidad ? `<p><strong>Especialidad:</strong> ${u.especialidad}</p>` : ""}
          ${u.materias ? `<p><strong>Materias:</strong> ${u.materias}</p>` : ""}
          ${u.tipo_documento ? `<p><strong>Documento:</strong> ${u.tipo_documento}</p>` : ""}
          <p><strong>Registro:</strong> ${formatearFecha(u.fecha_registro)}</p>
          ${u.fecha_rechazo ? `<p><strong>Fecha de rechazo:</strong> ${formatearFecha(u.fecha_rechazo)}</p>` : ""}
          ${u.fecha_reenvio_documento ? `<p><strong>Reenvío:</strong> ${formatearFecha(u.fecha_reenvio_documento)}</p>` : ""}
        </div>

        ${u.motivo_rechazo ? `<div class="admin-note"><strong>Motivo de rechazo:</strong><br>${u.motivo_rechazo}</div>` : ""}
        ${Number(u.documento_reenviado || 0) === 1 ? `<div class="admin-note"><strong>Documento reenviado:</strong><br>${u.nombre} volvió a subir su documento y está esperando una nueva revisión.</div>` : ""}

        ${renderPreviewArchivo(documentoCompleto, "Ver documento")}

        <div class="admin-actions">
          <button class="btn success" data-approve="${u.id_usuario}">Aprobar</button>
          <button class="btn danger" data-reject="${u.id_usuario}">Rechazar</button>
        </div>
      `;

      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-approve]")?.addEventListener("click", () => aprobarUsuarioDirecto(u.id_usuario));
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-reject]")?.addEventListener("click", () => rechazarUsuarioDirecto(u.id_usuario, u.nombre));

      contenedor.appendChild(card);
    });

    setAdminMessage("Usuarios cargados correctamente.");
  } catch (error) {
    console.error("Error al ver usuarios:", error);
    renderEmpty("resultadoAdmin", "Error al obtener usuarios.");
    setAdminMessage("No se pudieron cargar los usuarios.");
  }
}

// Se encarga de aprobar material directo en esta pantalla y mantiene conectada la vista con el backend.
async function aprobarMaterialDirecto(id) {
  try {
    const { data } = await fetchJson(`${API}/api/materiales/admin/${id}/approve`, {
      method: "PUT"
    });

    setAdminMessage(data.message || "Respuesta recibida.");

    if (data.ok) {
      await verMateriales();
    }
  } catch (error) {
    console.error("Error al aprobar material:", error);
    setAdminMessage("Ocurrió un error al aprobar el material.");
  }
}

// Se encarga de rechazar material directo en esta pantalla y mantiene conectada la vista con el backend.
function rechazarMaterialDirecto(id, titulo) {
  abrirModalRechazo({
    tipo: "material",
    id,
    titulo: "Rechazar material",
    descripcion: `Vas a rechazar el material "${titulo}". Puedes escribir un motivo de rechazo.`,
    refreshFn: verMateriales
  });
}

// Se encarga de ver materiales en esta pantalla y mantiene conectada la vista con el backend.
async function verMateriales() {
  try {
    const { data } = await fetchJson(`${API}/api/materiales/admin/todos`);

    const contenedor = document.getElementById("resultadoMaterialesAdmin");
    if (!contenedor) return;

    if (!data.ok) {
      renderEmpty("resultadoMaterialesAdmin", data.message || "No se pudieron cargar los materiales.");
      return;
    }

    if (!data.materiales || data.materiales.length === 0) {
      renderEmpty("resultadoMaterialesAdmin", "No hay materiales registrados.");
      return;
    }

    contenedor.innerHTML = "";

    data.materiales.forEach((m) => {
      const archivoCompleto = m.archivo_url ? `${API}${m.archivo_url}` : "";
      const estado = formatearEstadoRevision(m.estado_revision);

      const card = document.createElement("article");
      card.className = "admin-card";

      card.innerHTML = `
        <div class="admin-card-header">
          <div>
            <h3>${m.titulo}</h3>
            <p class="admin-muted">${m.nombre_asesor} · ${m.correo_asesor}</p>
          </div>
          <span class="status-pill ${estadoClass(estado)}">${estado}</span>
        </div>

        <div class="admin-meta">
          <p><strong>ID:</strong> ${m.id_material}</p>
          <p><strong>Materia:</strong> ${m.materia}</p>
          <p><strong>Fecha:</strong> ${formatearFecha(m.fecha_subida)}</p>
        </div>

        ${m.descripcion ? `<div class="admin-note">${m.descripcion}</div>` : ""}
        ${m.motivo_revision ? `<div class="admin-note"><strong>Motivo rechazo:</strong> ${m.motivo_revision}</div>` : ""}

        ${renderPreviewArchivo(archivoCompleto, "Abrir archivo")}

        <div class="admin-actions">
          <button class="btn success" data-approve="${m.id_material}">Aprobar</button>
          <button class="btn danger" data-reject="${m.id_material}">Rechazar</button>
        </div>
      `;

      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-approve]")?.addEventListener("click", () => aprobarMaterialDirecto(m.id_material));
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-reject]")?.addEventListener("click", () => rechazarMaterialDirecto(m.id_material, m.titulo));

      contenedor.appendChild(card);
    });

    setAdminMessage("Materiales cargados correctamente.");
  } catch (error) {
    console.error("Error al ver materiales:", error);
    renderEmpty("resultadoMaterialesAdmin", "Error al obtener materiales.");
    setAdminMessage("No se pudieron cargar los materiales.");
  }
}

// Se encarga de aprobar cuestionario directo en esta pantalla y mantiene conectada la vista con el backend.
async function aprobarCuestionarioDirecto(id) {
  try {
    const { data } = await fetchJson(`${API}/api/cuestionarios/admin/${id}/approve`, {
      method: "PUT"
    });

    setAdminMessage(data.message || "Respuesta recibida.");

    if (data.ok) {
      await verCuestionarios();
    }
  } catch (error) {
    console.error("Error al aprobar cuestionario:", error);
    setAdminMessage("Ocurrió un error al aprobar el cuestionario.");
  }
}

// Se encarga de rechazar cuestionario directo en esta pantalla y mantiene conectada la vista con el backend.
function rechazarCuestionarioDirecto(id, titulo) {
  abrirModalRechazo({
    tipo: "cuestionario",
    id,
    titulo: "Rechazar cuestionario",
    descripcion: `Vas a rechazar el cuestionario "${titulo}". Puedes escribir un motivo de rechazo.`,
    refreshFn: verCuestionarios
  });
}

// Se encarga de ver cuestionarios en esta pantalla y mantiene conectada la vista con el backend.
async function verCuestionarios() {
  try {
    const { data } = await fetchJson(`${API}/api/cuestionarios/admin/todos`);

    const contenedor = document.getElementById("resultadoCuestionariosAdmin");
    if (!contenedor) return;

    if (!data.ok) {
      renderEmpty("resultadoCuestionariosAdmin", data.message || "No se pudieron cargar los cuestionarios.");
      return;
    }

    if (!data.cuestionarios || data.cuestionarios.length === 0) {
      renderEmpty("resultadoCuestionariosAdmin", "No hay cuestionarios registrados.");
      return;
    }

    contenedor.innerHTML = "";

    data.cuestionarios.forEach((c) => {
      const estado = formatearEstadoRevision(c.estado_revision);

      const card = document.createElement("article");
      card.className = "admin-card";

      card.innerHTML = `
        <div class="admin-card-header">
          <div>
            <h3>${c.titulo}</h3>
            <p class="admin-muted">${c.nombre_asesor} · ${c.correo_asesor}</p>
          </div>
          <span class="status-pill ${estadoClass(estado)}">${estado}</span>
        </div>

        <div class="admin-meta">
          <p><strong>ID:</strong> ${c.id_cuestionario}</p>
          <p><strong>Materia:</strong> ${c.materia}</p>
          <p><strong>Fecha:</strong> ${formatearFecha(c.fecha_creacion)}</p>
        </div>

        ${c.descripcion ? `<div class="admin-note">${c.descripcion}</div>` : ""}
        ${c.motivo_revision ? `<div class="admin-note"><strong>Motivo rechazo:</strong> ${c.motivo_revision}</div>` : ""}

        <div class="admin-actions">
          <button class="btn outline" data-view="${c.id_cuestionario}">Ver preguntas</button>
          <button class="btn success" data-approve="${c.id_cuestionario}">Aprobar</button>
          <button class="btn danger" data-reject="${c.id_cuestionario}">Rechazar</button>
        </div>
      `;

      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-view]")?.addEventListener("click", () => verPreguntasCuestionarioAdmin(c.id_cuestionario));
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-approve]")?.addEventListener("click", () => aprobarCuestionarioDirecto(c.id_cuestionario));
      // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
      card.querySelector("[data-reject]")?.addEventListener("click", () => rechazarCuestionarioDirecto(c.id_cuestionario, c.titulo));

      contenedor.appendChild(card);
    });

    setAdminMessage("Cuestionarios cargados correctamente.");
  } catch (error) {
    console.error("Error al ver cuestionarios:", error);
    renderEmpty("resultadoCuestionariosAdmin", "Error al obtener cuestionarios.");
    setAdminMessage("No se pudieron cargar los cuestionarios.");
  }
}


/* =========================
   REPORTES ASESORÍAS
========================= */

// Se encarga de actualizar estado reporte en esta pantalla y mantiene conectada la vista con el backend.
async function actualizarEstadoReporte(idReporte, estado) {

  try {

    const { data } = await fetchJson(
      `${API}/api/admin/reportes/${idReporte}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          estado
        })
      }
    );

    setAdminMessage(
      data.message || "Respuesta recibida."
    );

    if (data.ok) {
      await verReportesAdmin();
    }

  } catch (error) {

    console.error(
      "Error al actualizar reporte:",
      error
    );

    setAdminMessage(
      "Ocurrió un error al actualizar el reporte."
    );

  }

}

// Se encarga de ver reportes admin en esta pantalla y mantiene conectada la vista con el backend.
async function verReportesAdmin() {

  try {

    const { data } = await fetchJson(
      `${API}/api/admin/reportes`
    );

    const contenedor =
      document.getElementById(
        "resultadoReportesAdmin"
      );

    if (!contenedor) return;

    if (!data.ok) {

      renderEmpty(
        "resultadoReportesAdmin",
        data.message || "No se pudieron cargar los reportes."
      );

      return;
    }

    const reportes = data.reportes || [];

    if (reportes.length === 0) {

      renderEmpty(
        "resultadoReportesAdmin",
        "No hay reportes registrados."
      );

      return;
    }

    contenedor.innerHTML = "";

    reportes.forEach((r) => {

      const estado =
        r.estado || "pendiente";

      const card =
        document.createElement("article");

      card.className = "admin-card";

      card.innerHTML = `
  <div class="admin-card-header">

    <div>

      <h3>
         ${r.motivo}
      </h3>

      <p class="admin-muted">
        Reporte #${r.id_reporte}
      </p>

    </div>

    <span class="status-pill ${estadoClass(estado)}">

      ${
        estado === "pendiente"
          ? " Pendiente revisión"
          : estado === "revisado"
            ? " En revisión"
            : " Resuelto"
      }

    </span>

  </div>

  <div class="admin-meta">

    <p>
      <strong>Alumno:</strong>
      ${r.nombre_alumno} · Alumno
    </p>

    <p>
      <strong>Correo alumno:</strong>
      ${r.correo_alumno}
    </p>

    <p>
      <strong>Asesor reportado:</strong>
      ${r.nombre_asesor} · Asesor
    </p>
    <p>
  <strong>Total reportes:</strong>
  ${r.total_reportes || 1}
</p>

    <p>
      <strong>Correo asesor:</strong>
      ${r.correo_asesor}
    </p>

    <p>
      <strong>Fecha asesoría:</strong>
      ${r.fecha_asesoria || "-"}
    </p>

    <p>
      <strong>Hora:</strong>
      ${r.hora_asesoria || "-"}
    </p>

    <p>
      <strong>Tipo:</strong>
      ${r.tipo_asesoria || "-"}
    </p>

    <p>
      <strong>Fecha reporte:</strong>
      ${formatearFecha(r.fecha_reporte)}
    </p>

  </div>

  ${
    r.descripcion
      ? `
        <div class="admin-note">
          <strong>Descripción:</strong><br>
          ${r.descripcion}
        </div>
      `
      : ""
  }

  ${
  r.evidencia_url
    ? `
      <div class="admin-note">

        <strong>
          Evidencia adjunta:
        </strong>

        <br><br>

        ${
          esImagen(r.evidencia_url)
            ? `
              <img
                src="${API}${r.evidencia_url}"
                alt="Evidencia"
                class="admin-preview-image"
              >
            `
            : `
              <a
                href="${API}${r.evidencia_url}"
                target="_blank"
                class="btn outline"
              >
                Ver PDF
              </a>
            `
        }

      </div>
    `
    : ""
}

  ${
    r.mensaje_asesoria
      ? `
        <div class="admin-note">
          <strong>Mensaje original:</strong><br>
          ${r.mensaje_asesoria}
        </div>
      `
      : ""
  }

  <div class="admin-actions">

    ${
      estado !== "revisado"
        ? `
          <button
            class="btn outline"
            data-revisado="${r.id_reporte}"
          >
            Revisar
          </button>
        `
        : ""
    }

    ${
      estado !== "resuelto"
        ? `
          <button
            class="btn success"
            data-resuelto="${r.id_reporte}"
          >
            Resolver
          </button>
        `
        : ""
    }

    ${
      estado !== "pendiente"
        ? `
          <button
            class="btn danger"
            data-pendiente="${r.id_reporte}"
          >
            Reabrir
          </button>
        `
        : ""
    }

  </div>
`;
      card
        .querySelector("[data-revisado]")
        ?.addEventListener("click", () => {

          actualizarEstadoReporte(
            r.id_reporte,
            "revisado"
          );

        });

      card
        .querySelector("[data-resuelto]")
        ?.addEventListener("click", () => {

          actualizarEstadoReporte(
            r.id_reporte,
            "resuelto"
          );

        });

      card
        .querySelector("[data-pendiente]")
        ?.addEventListener("click", () => {

          actualizarEstadoReporte(
            r.id_reporte,
            "pendiente"
          );

        });

      contenedor.appendChild(card);

    });

    setAdminMessage(
      `Reportes cargados correctamente. Pendientes: ${
        data.resumen?.pendientes || 0
      }`
    );

  } catch (error) {

    console.error(
      "Error al ver reportes:",
      error
    );

    renderEmpty(
      "resultadoReportesAdmin",
      "Error al obtener reportes."
    );

    setAdminMessage(
      "No se pudieron cargar los reportes."
    );

  }

}

// Se encarga de mostrar kpis en esta pantalla y mantiene conectada la vista con el backend.
function renderKpis(stats) {
  const contenedor = document.getElementById("resultadoStatsAdmin");
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="kpi-card">
      <span class="kpi-label">Usuarios</span>
      <span class="kpi-value">${stats.usuarios.total}</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Pendientes</span>
      <span class="kpi-value">${stats.usuarios.pendientes}</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Materiales</span>
      <span class="kpi-value">${stats.materiales.total}</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Cuestionarios</span>
      <span class="kpi-value">${stats.cuestionarios.total}</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Reseñas</span>
      <span class="kpi-value">${stats.resenas.total}</span>
    </div>
  `;
}

// Se encarga de ver stats admin en esta pantalla y mantiene conectada la vista con el backend.
async function verStatsAdmin() {

  try {

    const inicio =
      document.getElementById("fechaInicio")
        ?.value
        ?.trim() || "";

    const fin =
      document.getElementById("fechaFin")
        ?.value
        ?.trim() || "";

    if (
      (inicio && !fin) ||
      (!inicio && fin)
    ) {

      Swal.fire({

        icon: "warning",

        title: "Fechas incompletas",

        text: "Debes seleccionar ambas fechas."

      });

      return;

    }

    if (
      inicio &&
      fin &&
      inicio > fin
    ) {

      Swal.fire({

        icon: "warning",

        title: "Rango inválido",

        text: "La fecha inicial no puede ser mayor a la final."

      });

      return;

    }

    let url =
      `${API}/api/stats/admin`;

    if (inicio && fin) {

      const params =
        new URLSearchParams({

          inicio,
          fin

        });

      url += `?${params.toString()}`;

    }

    const { data } =
      await fetchJson(url);

    if (!data.ok) {

      renderEmpty(
        "resultadoStatsAdmin",
        data.message ||
        "No se pudieron cargar las estadísticas."
      );

      return;

    }

    const stats =
      data.stats;

    renderKpis(stats);

    const chartUsuariosRol =
      document.getElementById(
        "chartUsuariosRol"
      );

    const chartAdminAsesorias =
      document.getElementById(
        "chartAdminAsesorias"
      );

    const chartAdminContenido =
      document.getElementById(
        "chartAdminContenido"
      );

    const chartValidacionUsuarios =
      document.getElementById(
        "chartValidacionUsuarios"
      );

    if (
      typeof Chart === "undefined" ||
      !chartUsuariosRol ||
      !chartAdminAsesorias ||
      !chartAdminContenido ||
      !chartValidacionUsuarios
    ) {

      return;

    }

    const ctx1 =
      chartUsuariosRol.getContext("2d");

    if (chartUsuariosRolInstance) {

      chartUsuariosRolInstance.destroy();

    }

    chartUsuariosRolInstance =
      new Chart(ctx1, {

        type: "bar",

        data: {

          labels: [
            "Alumnos",
            "Asesores",
            "Admins"
          ],

          datasets: [
            {

              label: "Usuarios",

              data: [
                stats.usuarios.alumnos,
                stats.usuarios.asesores,
                stats.usuarios.admins
              ]

            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false

        }

      });

    const ctx2 =
      chartAdminAsesorias.getContext("2d");

    if (chartAdminAsesoriasInstance) {

      chartAdminAsesoriasInstance.destroy();

    }

    chartAdminAsesoriasInstance =
      new Chart(ctx2, {

        type: "bar",

        data: {

          labels: [
            "Pendientes",
            "Aceptadas",
            "Finalizadas",
            "Rechazadas"
          ],

          datasets: [
            {

              label: "Asesorías",

              data: [
                stats.asesorias.pendientes,
                stats.asesorias.aceptadas,
                stats.asesorias.finalizadas,
                stats.asesorias.rechazadas
              ]

            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false

        }

      });

    const ctx3 =
      chartAdminContenido.getContext("2d");

    if (chartAdminContenidoInstance) {

      chartAdminContenidoInstance.destroy();

    }

    chartAdminContenidoInstance =
      new Chart(ctx3, {

        type: "doughnut",

        data: {

          labels: [
            "Materiales",
            "Cuestionarios"
          ],

          datasets: [
            {

              label: "Contenido",

              data: [
                stats.materiales.total,
                stats.cuestionarios.total
              ]

            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false

        }

      });

    const ctx4 =
      chartValidacionUsuarios.getContext("2d");

    if (chartValidacionUsuariosInstance) {

      chartValidacionUsuariosInstance.destroy();

    }

    chartValidacionUsuariosInstance =
      new Chart(ctx4, {

        type: "pie",

        data: {

          labels: [
            "Pendientes",
            "Verificados",
            "Rechazados"
          ],

          datasets: [
            {

              label: "Validación",

              data: [
                stats.usuarios.pendientes,
                stats.usuarios.verificados,
                stats.usuarios.rechazados
              ]

            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false

        }

      });

    setAdminMessage(
      "Estadísticas actualizadas correctamente."
    );

  } catch (error) {

    console.error(
      "Error al ver estadísticas admin:",
      error
    );

    renderEmpty(
      "resultadoStatsAdmin",
      "Error al obtener estadísticas generales."
    );

    setAdminMessage(
      "No se pudieron actualizar las estadísticas."
    );

  }

}

function limpiarFiltroStatsAdmin() {

  const inicio = document.getElementById("fechaInicio");
  const fin = document.getElementById("fechaFin");

  if (inicio) inicio.value = "";
  if (fin) fin.value = "";

  verStatsAdmin();

}
// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnVerStatsAdmin")
  ?.addEventListener(
    "click",
    verStatsAdmin
  );

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnFiltrarStats")
  ?.addEventListener(
    "click",
    verStatsAdmin
  );

// Este listener limpia el rango de fechas del resumen general.
document
  .getElementById("btnLimpiarStats")
  ?.addEventListener(
    "click",
    limpiarFiltroStatsAdmin
  );
  // Se encarga de ver top asesores en esta pantalla y mantiene conectada la vista con el backend.
async function verTopAsesores() {

  try {

    const { data } =
      await fetchJson(
        `${API}/api/stats/top-asesores`
      );

    if (!data.ok) {
      return;
    }

    /* =========================
       SOLO TOP 5
    ========================= */

    const asesores =
      (data.asesores || [])
        .slice(0, 5);

    const canvas =
      document.getElementById(
        "chartTopAsesores"
      );

    const lista =
      document.getElementById(
        "topAsesoresLista"
      );

    if (!canvas || !lista) {
      return;
    }

    const nombres =
      asesores.map(a => a.nombre);

    const promedios =
      asesores.map(a => Number(a.promedio));

    const ctx =
      canvas.getContext("2d");

    if (chartTopAsesoresInstance) {
      chartTopAsesoresInstance.destroy();
    }

    /* =========================
       GRAFICA HORIZONTAL
    ========================= */

    chartTopAsesoresInstance =
      new Chart(ctx, {

        type: "bar",

        data: {

          labels: nombres,

          datasets: [
            {
              label: "Calificación promedio",

              data: promedios,

              borderRadius: 12,

              borderSkipped: false,

              barThickness: 28
            }
          ]
        },

        options: {

          indexAxis: "y",

          responsive: true,

          maintainAspectRatio: false,

          plugins: {

            legend: {
              display: false
            },

            tooltip: {

              callbacks: {

                label(context) {

                  return `⭐ ${context.raw}/5`;

                }

              }

            }

          },

          scales: {

            x: {

              beginAtZero: true,

              max: 5,

              ticks: {

                stepSize: 1
              }

            },

            y: {

              ticks: {

                font: {
                  size: 14,
                  weight: "600"
                }

              }

            }

          }

        }

      });

    /* =========================
       CARDS DETALLADAS
    ========================= */

    lista.innerHTML = "";

    asesores.forEach((a, index) => {

      const posicion =
        index === 0
          ? "🥇"
          : index === 1
            ? "🥈"
            : index === 2
              ? "🥉"
              : `#${index + 1}`;

      const porcentaje =
        (Number(a.promedio) / 5) * 100;

      lista.innerHTML += `

        <article class="top-asesor-card">

          <div class="top-asesor-left">

            <div class="top-ranking">
              ${posicion}
            </div>

            <div>

              <h4 class="top-name">
                ${a.nombre} <span class="role-badge role-asesor inline">Asesor</span>
              </h4>

              <p class="top-meta">
                ${a.total_resenas} reseñas registradas
              </p>

            </div>

          </div>

          <div class="top-asesor-right">

            <div class="top-rating">

              ⭐ ${Number(a.promedio).toFixed(1)}

            </div>

            <div class="top-progress">

              <div
                class="top-progress-fill"
                style="width:${porcentaje}%"
              ></div>

            </div>

          </div>

        </article>

      `;

    });

  } catch (error) {

    console.error(
      "Error al cargar top asesores:",
      error
    );

  }

}
// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnVerUsuarios")
  ?.addEventListener(
    "click",
    verUsuarios
  );

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnVerMateriales")
  ?.addEventListener(
    "click",
    verMateriales
  );

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnVerCuestionarios")
  ?.addEventListener(
    "click",
    verCuestionarios
  );

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnVerReportes")
  ?.addEventListener(
    "click",
    verReportesAdmin
  );



  inicializarModal();
inicializarModalCuestionario();
cargarPerfilAdmin();
verStatsAdmin();
verTopAsesores();
// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnLogout")
  ?.addEventListener("click", () => {

    localStorage.removeItem("token");

    window.location.href =
      "/pages/login.html";

  });

  /* =========================
   TABS ADMIN
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const tabButtons =
    document.querySelectorAll(".admin-tab-btn");

  const tabContents =
    document.querySelectorAll(".admin-tab-content");

  function abrirTab(tabId) {

    /* OCULTAR TODO */

    tabContents.forEach(section => {

      section.classList.remove("active");

    });

    /* LIMPIAR BOTONES */

    tabButtons.forEach(btn => {

      btn.classList.remove("active");

    });

    /* MOSTRAR TAB */

    const tab =
      document.getElementById(`tab-${tabId}`);

    if (tab) {

      tab.classList.add("active");

    }

    /* ACTIVAR BOTON */

    const botonActivo =
      document.querySelector(
        `.admin-tab-btn[data-tab="${tabId}"]`
      );

    if (botonActivo) {

      botonActivo.classList.add("active");

    }

    /* SCROLL ARRIBA */

    window.scrollTo(0, 0);

  }

  /* =========================
     BOTONES TABS
  ========================= */

  tabButtons.forEach(btn => {

    btn.addEventListener("click", () => {

      const tabId =
        btn.dataset.tab;

      abrirTab(tabId);

    });

  });

  /* =========================
     QUICK CARDS
  ========================= */

  const quickButtons =
    document.querySelectorAll("[data-tab-open]");

  quickButtons.forEach(btn => {

    btn.addEventListener("click", () => {

      const tabId =
        btn.dataset.tabOpen;

      abrirTab(tabId);

    });

  });

  /* =========================
     TAB INICIAL
  ========================= */

  abrirTab("usuarios");

});


