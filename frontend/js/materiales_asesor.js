const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let tabMaterialesActiva = "subir";

if (!token) {
  window.location.href = "/pages/login.html";
}

function ocultarMensaje() {
  const box = document.getElementById("mensajeMaterial");
  box.textContent = "";
  box.classList.add("hidden");
}

function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeMaterial");
  box.textContent = texto;
  box.classList.remove("hidden");
}

function mostrarToast(tipo, texto) {
  if (window.EduQuakUI) {
    window.EduQuakUI.toast(tipo, texto);
    return;
  }

  mostrarMensaje(texto);
}

function resolverUrlArchivo(url) {
  if (!url) return "#";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API}${path}`;
}

async function leerJsonSeguro(res) {
  try {
    return await res.json();
  } catch (error) {
    console.error("La respuesta no fue JSON:", error);
    return {
      ok: false,
      message: "La respuesta del servidor no fue válida. Revisa Render/servidor."
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
    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      mostrarToast("success", "Material eliminado correctamente");
      await cargarMateriales();
    }
  } catch (error) {
    console.error("Error al eliminar material:", error);
    mostrarMensaje("Error al eliminar el material.");
  } finally {
    window.EduQuakLoading?.forceHide?.();
  }
}

function renderMateriales(lista) {
  const contenedor = document.getElementById("listaMaterialesAsesor");
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
          <h3>${material.titulo || "Material sin título"}</h3>
          <span class="materia-pill">${material.materia || "Sin materia"}</span>
        </div>
        <span class="estado-pill ${claseEstado}">${textoEstado}</span>
      </div>

      <p class="info-line"><strong>Fecha:</strong> ${material.fecha_subida || "-"}</p>

      ${
        material.descripcion
          ? `
            <div class="descripcion-box">
              ${material.descripcion}
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
              <strong>Motivo de rechazo:</strong> ${material.motivo_revision}
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

        <button class="btn danger" data-eliminar="${material.id_material}">
          Eliminar
        </button>
      </div>
    `;

    const btnEliminar = card.querySelector("[data-eliminar]");
    btnEliminar.addEventListener("click", () =>
      eliminarMaterial(material.id_material, material.estado_revision)
    );

    contenedor.appendChild(card);
  });
}

async function cargarMateriales() {
  try {
    const res = await fetch(`${API}/api/materiales/mis`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await leerJsonSeguro(res);
    console.log("Mis materiales:", data);

    if (!data.ok) {
      document.getElementById("listaMaterialesAsesor").innerHTML = `
        <div class="empty-state">No se pudieron cargar tus materiales.</div>
      `;
      ocultarMensaje();
      return;
    }

    renderMateriales(data.materiales || []);
  } catch (error) {
    console.error("Error al cargar materiales:", error);
    document.getElementById("listaMaterialesAsesor").innerHTML = `
      <div class="empty-state">Error al cargar tus materiales.</div>
    `;
    ocultarMensaje();
  } finally {
    window.EduQuakLoading?.forceHide?.();
  }
}

document.getElementById("formMaterial").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit']");
  const archivo = document.getElementById("archivoMaterial")?.files?.[0];

  ocultarMensaje();

  if (!archivo) {
    mostrarMensaje("Selecciona un archivo antes de subir el material.");
    return;
  }

  const limiteMB = 10;
  if (archivo.size > limiteMB * 1024 * 1024) {
    mostrarMensaje(`El archivo pesa más de ${limiteMB} MB. Usa uno más ligero.`);
    return;
  }

  const formData = new FormData(form);

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Subiendo...";
    }

    const res = await fetch(`${API}/api/materiales/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await leerJsonSeguro(res);
    console.log("Subir material:", data);

    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      mostrarToast("success", "Material subido correctamente. Quedó en revisión.");
      form.reset();
      await cargarMateriales();
      cambiarTabMateriales("mis-materiales");
    } else {
      mostrarToast("error", data.message || "No se pudo subir el material.");
    }
  } catch (error) {
    console.error("Error al subir material:", error);
    mostrarMensaje("Error al subir el material. Revisa tu conexión o el servidor.");
    mostrarToast("error", "Error al subir el material.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Subir material";
    }

    window.EduQuakLoading?.forceHide?.();
  }
});

document.getElementById("tabBtnSubirMaterial").addEventListener("click", () => {
  cambiarTabMateriales("subir");
});

document.getElementById("tabBtnMisMateriales").addEventListener("click", () => {
  cambiarTabMateriales("mis-materiales");
});

ocultarMensaje();
cambiarTabMateriales("subir");
cargarMateriales();
