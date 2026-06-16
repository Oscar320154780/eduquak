const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let tabMaterialesActiva = "subir";

if (!token) {
  window.location.href = "/pages/login.html";
}

function ocultarMensaje() {
  const box = document.getElementById("mensajeMaterial");
  if (!box) return;
  box.textContent = "";
  box.classList.add("hidden");
}

function mostrarMensaje(texto, tipo = "info") {
  const box = document.getElementById("mensajeMaterial");
  if (!box) {
    alert(texto);
    return;
  }

  box.textContent = texto;
  box.classList.remove("hidden");
  box.dataset.tipo = tipo;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function mostrarToast(tipo, texto) {
  if (window.EduQuakUI?.toast) {
    window.EduQuakUI.toast(tipo, texto);
    return;
  }

  mostrarMensaje(texto, tipo);
}

function resolverUrlArchivo(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API}${path}`;
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function leerJsonSeguro(res) {
  const texto = await res.text();

  try {
    return texto ? JSON.parse(texto) : { ok: false, message: `Respuesta vacía. HTTP ${res.status}` };
  } catch (error) {
    console.error("Respuesta no JSON del servidor:", texto);
    return {
      ok: false,
      message: `El servidor respondió algo no válido. HTTP ${res.status}`
    };
  }
}

function estadoClase(estado) {
  const valor = (estado || "").toLowerCase();

  if (valor === "aprobado") return "aprobado";
  if (valor === "rechazado") return "rechazado";
  return "pendiente";
}

function cambiarTabMateriales(tab) {
  tabMaterialesActiva = tab;

  const btnSubir = document.getElementById("tabBtnSubirMaterial");
  const btnMisMateriales = document.getElementById("tabBtnMisMateriales");
  const panelSubir = document.getElementById("panelTabSubirMaterial");
  const panelMisMateriales = document.getElementById("panelTabMisMateriales");

  if (!btnSubir || !btnMisMateriales || !panelSubir || !panelMisMateriales) return;

  const esSubir = tab === "subir";

  btnSubir.classList.toggle("active", esSubir);
  btnMisMateriales.classList.toggle("active", !esSubir);

  btnSubir.setAttribute("aria-selected", esSubir ? "true" : "false");
  btnMisMateriales.setAttribute("aria-selected", esSubir ? "false" : "true");

  panelSubir.classList.toggle("hidden", !esSubir);
  panelSubir.classList.toggle("active", esSubir);

  panelMisMateriales.classList.toggle("hidden", esSubir);
  panelMisMateriales.classList.toggle("active", !esSubir);
}

async function eliminarMaterial(idMaterial, estadoRevision) {
  const estado = (estadoRevision || "").toLowerCase();

  const mensajeConfirmacion =
    estado === "aprobado"
      ? "Este material ya está visible para los alumnos. ¿Seguro que deseas eliminarlo?"
      : "¿Seguro que quieres eliminar este material?";

  const confirmado = window.EduQuakUI
    ? await window.EduQuakUI.confirm({
        title: "¿Eliminar material?",
        text: mensajeConfirmacion,
        confirmText: "Sí, eliminar",
        cancelText: "Cancelar",
        icon: "question",
        confirmButtonColor: "#dc2626"
      })
    : window.confirm(mensajeConfirmacion);

  if (!confirmado) return;

  try {
    const res = await fetch(`${API}/api/materiales/${idMaterial}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await leerJsonSeguro(res);
    console.log("Eliminar material:", data);
    mostrarMensaje(data.message || "Respuesta recibida.", data.ok ? "success" : "error");

    if (data.ok) {
      mostrarToast("success", "Material eliminado correctamente");
      await cargarMateriales();
    } else {
      mostrarToast("error", data.message || "No se pudo eliminar el material.");
    }
  } catch (error) {
    console.error("Error al eliminar material:", error);
    mostrarMensaje("Error al eliminar el material.", "error");
  } finally {
    window.EduQuakLoading?.forceHide?.();
  }
}

function renderMateriales(lista) {
  const contenedor = document.getElementById("listaMaterialesAsesor");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no has subido materiales.
      </div>
    `;
    return;
  }

  lista.forEach((material) => {
    const estado = material.estado_revision || "pendiente_revision";
    const claseEstado = estadoClase(estado);
    const archivoUrl = resolverUrlArchivo(material.archivo_url);
    const textoEstado = estado === "pendiente_revision" ? "pendiente" : estado;

    const card = document.createElement("article");
    card.className = "material-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${escapeHtml(material.titulo || "Material sin título")}</h3>
          <span class="materia-pill">${escapeHtml(material.materia || "Sin materia")}</span>
        </div>
        <span class="estado-pill ${claseEstado}">${escapeHtml(textoEstado)}</span>
      </div>

      <p class="info-line"><strong>Fecha:</strong> ${escapeHtml(material.fecha_subida || "-")}</p>

      ${
        material.descripcion
          ? `
            <div class="descripcion-box">
              ${escapeHtml(material.descripcion)}
            </div>
          `
          : ""
      }

      ${
        material.archivo_url
          ? `
            <div class="archivo-box">
              Archivo listo para abrir o descargar.
            </div>
          `
          : ""
      }

      ${
        material.motivo_revision
          ? `
            <div class="motivo-box">
              <strong>Motivo de rechazo:</strong> ${escapeHtml(material.motivo_revision)}
            </div>
          `
          : ""
      }

      <div class="button-row">
        ${
          material.archivo_url
            ? `<a href="${archivoUrl}" target="_blank" rel="noopener" class="btn primary">Abrir archivo</a>`
            : ""
        }

        ${
          material.archivo_url
            ? `<a href="${archivoUrl}" target="_blank" rel="noopener" class="btn outline" download>Descargar</a>`
            : ""
        }

        <button class="btn danger" type="button" data-eliminar="${material.id_material}">
          Eliminar
        </button>
      </div>
    `;

    const btnEliminar = card.querySelector("[data-eliminar]");
    btnEliminar?.addEventListener("click", () =>
      eliminarMaterial(material.id_material, material.estado_revision)
    );

    contenedor.appendChild(card);
  });
}

async function cargarMateriales() {
  const contenedor = document.getElementById("listaMaterialesAsesor");

  try {
    const res = await fetch(`${API}/api/materiales/mis`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await leerJsonSeguro(res);
    console.log("Mis materiales:", data);

    if (!data.ok) {
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="empty-state">No se pudieron cargar tus materiales.</div>
        `;
      }
      ocultarMensaje();
      return;
    }

    renderMateriales(data.materiales || []);
  } catch (error) {
    console.error("Error al cargar materiales:", error);
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="empty-state">Error al cargar tus materiales.</div>
      `;
    }
    ocultarMensaje();
  } finally {
    window.EduQuakLoading?.forceHide?.();
  }
}

function validarFormularioMaterial() {
  const titulo = document.getElementById("tituloMaterial")?.value?.trim();
  const materia = document.getElementById("materiaMaterial")?.value?.trim();
  const archivo = document.getElementById("archivoMaterial")?.files?.[0];

  console.log("Validando material:", {
    titulo,
    materia,
    archivo: archivo ? archivo.name : null,
    size: archivo ? archivo.size : null
  });

  if (!titulo) {
    mostrarMensaje("Escribe el título del material.", "error");
    return false;
  }

  if (!materia) {
    mostrarMensaje("Escribe la materia del material.", "error");
    return false;
  }

  if (!archivo) {
    mostrarMensaje("Selecciona un archivo antes de subir el material.", "error");
    return false;
  }

  const limiteMB = 10;
  if (archivo.size > limiteMB * 1024 * 1024) {
    mostrarMensaje(`El archivo pesa más de ${limiteMB} MB. Usa uno más ligero.`, "error");
    return false;
  }

  const extension = `.${archivo.name.split(".").pop() || ""}`.toLowerCase();
  const permitidas = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".ppt", ".pptx"];

  if (!permitidas.includes(extension)) {
    mostrarMensaje(`Formato no permitido. Usa: ${permitidas.join(", ")}`, "error");
    return false;
  }

  return true;
}

async function subirMaterial(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  console.log("INICIO subirMaterial v4");

  const form = document.getElementById("formMaterial");
  const submitBtn = document.getElementById("btnSubirMaterial");

  if (!form) {
    mostrarMensaje("No se encontró el formulario de materiales.", "error");
    return false;
  }

  ocultarMensaje();

  if (!validarFormularioMaterial()) {
    console.warn("Validación detenida. No se envió al backend.");
    return false;
  }

  const formData = new FormData();
  formData.append("titulo", document.getElementById("tituloMaterial").value.trim());
  formData.append("materia", document.getElementById("materiaMaterial").value.trim());
  formData.append("descripcion", document.getElementById("descripcionMaterial")?.value?.trim() || "");
  formData.append("archivo", document.getElementById("archivoMaterial").files[0]);

  const archivo = document.getElementById("archivoMaterial")?.files?.[0];

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Subiendo...";
    }

    mostrarMensaje("Subiendo material, espera unos segundos...", "info");

    console.log("Enviando material al backend:", {
      url: `${API}/api/materiales/upload`,
      archivo: archivo?.name,
      pesoMB: archivo ? (archivo.size / 1024 / 1024).toFixed(2) : null
    });

    const res = await fetch(`${API}/api/materiales/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await leerJsonSeguro(res);

    console.log("Respuesta subida material v4:", {
      status: res.status,
      okHttp: res.ok,
      data
    });

    if (!res.ok || !data.ok) {
      const mensaje = data.message || `No se pudo subir el material. HTTP ${res.status}`;
      mostrarMensaje(mensaje, "error");
      mostrarToast("error", mensaje);
      return false;
    }

    mostrarMensaje(data.message || "Material subido correctamente. Quedó en revisión.", "success");
    mostrarToast("success", "Material subido correctamente. Quedó en revisión.");

    form.reset();
    await cargarMateriales();
    cambiarTabMateriales("mis-materiales");
    return true;
  } catch (error) {
    console.error("Error real al subir material v4:", error);
    mostrarMensaje("Error al subir el material. Revisa Network o los logs de Render.", "error");
    mostrarToast("error", "Error al subir el material.");
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Subir material";
    }

    window.EduQuakLoading?.forceHide?.();
  }
}

window.subirMaterial = subirMaterial;

function inicializarMaterialesAsesor() {
  const form = document.getElementById("formMaterial");
  const btnSubir = document.getElementById("btnSubirMaterial");

  console.log("Materiales asesor v4 listo:", {
    formMaterial: Boolean(form),
    btnSubirMaterial: Boolean(btnSubir),
    api: API || "misma URL"
  });

  form?.addEventListener("submit", subirMaterial);
  btnSubir?.addEventListener("click", subirMaterial);

  document.getElementById("tabBtnSubirMaterial")?.addEventListener("click", () => {
    cambiarTabMateriales("subir");
  });

  document.getElementById("tabBtnMisMateriales")?.addEventListener("click", () => {
    cambiarTabMateriales("mis-materiales");
  });

  ocultarMensaje();
  cambiarTabMateriales("subir");
  cargarMateriales();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarMaterialesAsesor);
} else {
  inicializarMaterialesAsesor();
}
