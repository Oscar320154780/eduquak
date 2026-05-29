// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let materialesCache = [];
let estadoAlumno = null;

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de obtener mi perfil en esta pantalla y mantiene conectada la vista con el backend.
async function obtenerMiPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      return null;
    }

    return data.user || null;
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return null;
  }
}

// Se encarga de alumno no verificado en esta pantalla y mantiene conectada la vista con el backend.
function alumnoNoVerificado() {
  return estadoAlumno !== "verificado";
}

// Se encarga de mostrar bloqueado en esta pantalla y mantiene conectada la vista con el backend.
function renderBloqueado() {
  const contenedor = document.getElementById("listaMateriales");

  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada por un administrador para ver materiales aprobados.
    </div>
  `;

  const inputBusqueda = document.getElementById("busquedaMaterial");
  if (inputBusqueda) {
    inputBusqueda.disabled = true;
    inputBusqueda.placeholder = "Función no disponible";
  }
}

// Se encarga de mostrar materiales en esta pantalla y mantiene conectada la vista con el backend.
function renderMateriales(lista) {
  const contenedor = document.getElementById("listaMateriales");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay materiales disponibles por ahora.
      </div>
    `;
    return;
  }

  lista.forEach((material) => {
    const archivoUrl = material.archivo_url ? `${API}${material.archivo_url}` : "#";

    const card = document.createElement("article");
    card.className = "material-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${material.titulo || "Material sin título"}</h3>
          <span class="materia-pill">${material.materia || "Sin materia"}</span>
        </div>
      </div>

      <p class="info-line"><strong>Asesor:</strong> ${material.nombre_asesor || "-"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${material.fecha_subida || "-"}</p>

      ${
        material.descripcion
          ? `<div class="descripcion-box">${material.descripcion}</div>`
          : ""
      }

      <div class="button-row">
        ${
          material.archivo_url
            ? `<a href="${archivoUrl}" target="_blank" class="btn primary">Abrir archivo</a>`
            : ""
        }
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// Se encarga de cargar materiales en esta pantalla y mantiene conectada la vista con el backend.
async function cargarMateriales() {
  try {
    const res = await fetch(`${API}/api/materiales/publicos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Materiales:", data);

    if (!data.ok) {
      document.getElementById("listaMateriales").innerHTML = `
        <div class="empty-state">No se pudieron cargar los materiales.</div>
      `;
      return;
    }

    materialesCache = data.materiales || [];
    renderMateriales(materialesCache);
  } catch (error) {
    console.error("Error al cargar materiales:", error);
    document.getElementById("listaMateriales").innerHTML = `
      <div class="empty-state">Error al cargar materiales.</div>
    `;
  }
}

// Este listener responde al evento "input" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("busquedaMaterial")?.addEventListener("input", (e) => {
  if (alumnoNoVerificado()) return;

  const texto = e.target.value.trim().toLowerCase();

  if (!texto) {
    renderMateriales(materialesCache);
    return;
  }

  const filtrados = materialesCache.filter((material) => {
    const titulo = (material.titulo || "").toLowerCase();
    const materia = (material.materia || "").toLowerCase();
    const asesor = (material.nombre_asesor || "").toLowerCase();
    const descripcion = (material.descripcion || "").toLowerCase();

    return (
      titulo.includes(texto) ||
      materia.includes(texto) ||
      asesor.includes(texto) ||
      descripcion.includes(texto)
    );
  });

  renderMateriales(filtrados);
});

// Se encarga de init en esta pantalla y mantiene conectada la vista con el backend.
async function init() {
  const perfil = await obtenerMiPerfil();

  if (!perfil || perfil.rol !== "alumno") {
    window.location.href = "/pages/login.html";
    return;
  }

  estadoAlumno = perfil.estado_validacion || null;

  if (alumnoNoVerificado()) {
    renderBloqueado();
    return;
  }

  cargarMateriales();
}

init();