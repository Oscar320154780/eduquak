// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let cuestionariosCache = [];
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
  const contenedor = document.getElementById("listaCuestionarios");

  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada por un administrador para ver cuestionarios.
    </div>
  `;

  const inputBusqueda = document.getElementById("busquedaCuestionario");
  if (inputBusqueda) {
    inputBusqueda.disabled = true;
    inputBusqueda.placeholder = "Función no disponible";
  }
}

// Se encarga de mostrar cuestionarios en esta pantalla y mantiene conectada la vista con el backend.
function renderCuestionarios(lista) {
  const contenedor = document.getElementById("listaCuestionarios");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay cuestionarios disponibles por ahora.
      </div>
    `;
    return;
  }

  lista.forEach((cuestionario) => {
    const card = document.createElement("article");
    card.className = "cuestionario-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${cuestionario.titulo || "Cuestionario sin título"}</h3>
          <span class="materia-pill">${cuestionario.materia || "Sin materia"}</span>
        </div>
      </div>

      <p class="info-line"><strong>Asesor:</strong> ${cuestionario.nombre_asesor || "-"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${cuestionario.fecha_creacion || "-"}</p>

      ${
        cuestionario.descripcion
          ? `<div class="descripcion-box">${cuestionario.descripcion}</div>`
          : ""
      }

      <div class="button-row">
        <a href="/pages/resolver_cuestionario.html?id=${cuestionario.id_cuestionario}" class="btn primary">
          Resolver cuestionario
        </a>
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// Se encarga de cargar cuestionarios en esta pantalla y mantiene conectada la vista con el backend.
async function cargarCuestionarios() {
  try {
    const res = await fetch(`${API}/api/cuestionarios/publicos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Cuestionarios:", data);

    if (!data.ok) {
      document.getElementById("listaCuestionarios").innerHTML = `
        <div class="empty-state">No se pudieron cargar los cuestionarios.</div>
      `;
      return;
    }

    cuestionariosCache = data.cuestionarios || [];
    renderCuestionarios(cuestionariosCache);
  } catch (error) {
    console.error("Error al cargar cuestionarios:", error);
    document.getElementById("listaCuestionarios").innerHTML = `
      <div class="empty-state">Error al cargar cuestionarios.</div>
    `;
  }
}

// Este listener responde al evento "input" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("busquedaCuestionario")?.addEventListener("input", (e) => {
  if (alumnoNoVerificado()) return;

  const texto = e.target.value.trim().toLowerCase();

  if (!texto) {
    renderCuestionarios(cuestionariosCache);
    return;
  }

  const filtrados = cuestionariosCache.filter((cuestionario) => {
    const titulo = (cuestionario.titulo || "").toLowerCase();
    const materia = (cuestionario.materia || "").toLowerCase();
    const asesor = (cuestionario.nombre_asesor || "").toLowerCase();
    const descripcion = (cuestionario.descripcion || "").toLowerCase();

    return (
      titulo.includes(texto) ||
      materia.includes(texto) ||
      asesor.includes(texto) ||
      descripcion.includes(texto)
    );
  });

  renderCuestionarios(filtrados);
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

  cargarCuestionarios();
}

init();