const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let estadoAlumno = null;
let paginaActual = 1;
const LIMITE_POR_PAGINA = 12;
let textoBusqueda = "";
let busquedaTimer = null;

if (!token) {
  window.location.href = "/pages/login.html";
}

async function obtenerMiPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    return data.ok ? data.user || null : null;
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return null;
  }
}

function alumnoNoVerificado() {
  return estadoAlumno !== "verificado";
}

function obtenerArchivoUrl(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API}${url}`;
}

function renderBloqueado() {
  const contenedor = document.getElementById("listaMateriales");
  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada por un administrador para ver materiales aprobados.
    </div>
  `;

  document.getElementById("paginacionMateriales")?.classList.add("hidden");

  const inputBusqueda = document.getElementById("busquedaMaterial");
  if (inputBusqueda) {
    inputBusqueda.disabled = true;
    inputBusqueda.placeholder = "Función no disponible";
  }
}


function formatearFechaCorta(valor) {
  if (!valor || String(valor).toLowerCase() === "pendiente") {
    return "Pendiente";
  }

  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function renderMateriales(lista) {
  const contenedor = document.getElementById("listaMateriales");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay materiales disponibles con esos filtros.
      </div>
    `;
    return;
  }

  lista.forEach((material) => {
    const archivoUrl = obtenerArchivoUrl(material.archivo_url);

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
      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(material.fecha_subida)}</p>

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

function renderPaginacion(pagination) {
  const paginacion = document.getElementById("paginacionMateriales");
  if (!paginacion) return;

  const total = Number(pagination?.total || 0);
  const page = Number(pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);
  const limit = Number(pagination?.limit || LIMITE_POR_PAGINA);
  const inicio = total === 0 ? 0 : (page - 1) * limit + 1;
  const fin = Math.min(page * limit, total);

  paginacion.classList.remove("hidden");
  paginacion.innerHTML = `
    <p class="pagination-info">Mostrando ${inicio}-${fin} de ${total} materiales</p>
    <div class="pagination-actions">
      <button class="btn outline" id="materialesAnterior" ${page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Página ${page} de ${totalPages}</span>
      <button class="btn outline" id="materialesSiguiente" ${page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;

  document.getElementById("materialesAnterior")?.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual -= 1;
      cargarMateriales();
    }
  });

  document.getElementById("materialesSiguiente")?.addEventListener("click", () => {
    if (paginaActual < totalPages) {
      paginaActual += 1;
      cargarMateriales();
    }
  });
}

async function cargarMateriales() {
  try {
    const params = new URLSearchParams({
      page: String(paginaActual),
      limit: String(LIMITE_POR_PAGINA)
    });

    if (textoBusqueda) params.set("q", textoBusqueda);

    const res = await fetch(`${API}/api/materiales/publicos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    console.log("Materiales:", data);

    if (!data.ok) {
      document.getElementById("listaMateriales").innerHTML = `
        <div class="empty-state">No se pudieron cargar los materiales.</div>
      `;
      document.getElementById("paginacionMateriales")?.classList.add("hidden");
      return;
    }

    renderMateriales(data.materiales || []);
    renderPaginacion(data.pagination || { page: paginaActual, limit: LIMITE_POR_PAGINA, total: 0, totalPages: 1 });
  } catch (error) {
    console.error("Error al cargar materiales:", error);
    document.getElementById("listaMateriales").innerHTML = `
      <div class="empty-state">Error al cargar materiales.</div>
    `;
    document.getElementById("paginacionMateriales")?.classList.add("hidden");
  }
}

document.getElementById("busquedaMaterial")?.addEventListener("input", (e) => {
  if (alumnoNoVerificado()) return;

  textoBusqueda = e.target.value.trim();
  paginaActual = 1;

  clearTimeout(busquedaTimer);
  busquedaTimer = setTimeout(() => {
    cargarMateriales();
  }, 300);
});

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
