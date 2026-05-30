// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let asesoresCache = [];
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

// Se encarga de generar estrellas en esta pantalla y mantiene conectada la vista con el backend.
function compararRankingAsesores(a, b) {
  const promedioB = Number(b.promedio ?? b.promedio_calificacion ?? 0);
  const promedioA = Number(a.promedio ?? a.promedio_calificacion ?? 0);

  if (promedioB !== promedioA) {
    return promedioB - promedioA;
  }

  const totalB = Number(
    b.total ??
    b.total_calificaciones ??
    b.total_resenas ??
    b.total_resenas ??
    0
  );

  const totalA = Number(
    a.total ??
    a.total_calificaciones ??
    a.total_resenas ??
    a.total_resenas ??
    0
  );

  if (totalB !== totalA) {
    return totalB - totalA;
  }

  return String(a.nombre || "").localeCompare(String(b.nombre || ""));
}


function generarEstrellas(promedio) {
  const valor = Number(promedio) || 0;
  const llenas = Math.round(valor);
  const vacias = 5 - llenas;
  return "★".repeat(llenas) + "☆".repeat(vacias);
}

// Se encarga de mostrar mensaje principal en esta pantalla y mantiene conectada la vista con el backend.
function mostrarMensajePrincipal(texto) {
  const box = document.getElementById("mensajeSolicitar");
  if (box) {
    box.textContent = texto;
  }
}

// Se encarga de mostrar estado bloqueado en esta pantalla y mantiene conectada la vista con el backend.
function renderEstadoBloqueado() {
  const contenedor = document.getElementById("listaAsesores");

  contenedor.innerHTML = `
    <div class="empty-state">
      Tu cuenta debe estar verificada por un administrador para solicitar asesorías individuales.
    </div>
  `;

  mostrarMensajePrincipal(
    "Tu cuenta aún no está verificada. Esta función está deshabilitada."
  );

  const inputBusqueda = document.getElementById("busquedaAsesor");
  if (inputBusqueda) {
    inputBusqueda.disabled = true;
    inputBusqueda.placeholder = "Función no disponible";
  }
}


function renderTopAsesores(lista) {
  const seccion = document.getElementById("topAsesoresAlumno");
  const contenedor = document.getElementById("listaTopAsesoresAlumno");

  if (!seccion || !contenedor) return;

  const top = [...(lista || [])]
    .map((asesor) => ({
      ...asesor,
      promedio: Number(asesor.promedio_calificacion || 0),
      total: Number(asesor.total_calificaciones || 0)
    }))
    .filter((asesor) => asesor.promedio > 0 || asesor.total > 0)
    .sort(compararRankingAsesores)
    .slice(0, 3);

  if (!top.length) {
    seccion.classList.add("hidden");
    contenedor.innerHTML = "";
    return;
  }

  seccion.classList.remove("hidden");

  contenedor.innerHTML = top.map((asesor, index) => {
    const promedio = asesor.promedio.toFixed(1);
    const total = asesor.total;
    const width = Math.max(8, Math.min(100, asesor.promedio * 20));

    return `
      <article class="top-asesor-modern">
        <div class="top-rank">${index + 1}</div>

        <div class="top-info">
          <h3>${asesor.nombre} <span class="role-badge role-asesor inline">Asesor</span></h3>
          <p>${asesor.especialidad || "Asesor EduQuak"} · ${total} reseña${total === 1 ? "" : "s"}</p>
        </div>

        <div class="top-score">
          <strong>★ ${promedio}</strong>
          <div class="top-score-bar">
            <span style="width:${width}%"></span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function inicializarTopAsesoresAlumno() {
  const btn = document.getElementById("btnToggleTopAsesoresAlumno");
  const content = document.getElementById("topContentAlumno");
  const text = document.getElementById("topToggleTextAlumno");

  if (!btn || !content || !text) return;

  btn.addEventListener("click", () => {
    const oculto = content.classList.toggle("hidden");
    text.textContent = oculto ? "Mostrar" : "Ocultar";
  });
}

// Se encarga de mostrar asesores en esta pantalla y mantiene conectada la vista con el backend.
function renderAsesores(lista) {
  const contenedor = document.getElementById("listaAsesores");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No se encontraron asesores con ese criterio.
      </div>
    `;
    return;
  }

  lista.forEach((asesor) => {
    const promedio = Number(asesor.promedio_calificacion ?? 0);
    const total = Number(asesor.total_calificaciones ?? 0);

    const card = document.createElement("article");
    card.className = "asesor-card";

    card.innerHTML = `
      <div class="asesor-top">
        <h3>${asesor.nombre} <span class="role-badge role-asesor inline">Asesor</span></h3>
        <span class="rating-pill">
          ${generarEstrellas(promedio)} ${promedio}/5
        </span>
      </div>

      <p class="info-line"><strong>Especialidad:</strong> ${asesor.especialidad || "-"}</p>
      <p class="info-line"><strong>Materias:</strong> ${asesor.materias || "-"}</p>
      <p class="info-line"><strong>Institución:</strong> ${asesor.institucion || "-"}</p>
      <p class="info-line"><strong>Modalidad:</strong> ${asesor.modalidad || "-"}</p>
      <p class="info-line"><strong>Calificaciones:</strong> ${total}</p>

      ${
        asesor.descripcion
          ? `<div class="descripcion-box">${asesor.descripcion}</div>`
          : ""
      }

      <div class="solicitud-box">
        <label for="msg-${asesor.id_usuario}">Mensaje opcional</label>
        <input
          type="text"
          id="msg-${asesor.id_usuario}"
          placeholder="Ej. Necesito apoyo con ecuaciones diferenciales"
        >
        <button class="btn primary" data-id="${asesor.id_usuario}">
          Solicitar asesoría
        </button>
      </div>
    `;

    const boton = card.querySelector("button");
    // Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
    boton.addEventListener("click", () => solicitarAsesoria(asesor.id_usuario));

    contenedor.appendChild(card);
  });
}

// Se encarga de cargar asesores en esta pantalla y mantiene conectada la vista con el backend.
async function cargarAsesores() {
  try {
    const res = await fetch(`${API}/api/users/asesores`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Asesores:", data);

    if (!data.ok) {
      document.getElementById("listaAsesores").innerHTML = `
        <div class="empty-state">No se pudieron cargar los asesores.</div>
      `;
      return;
    }

    asesoresCache = data.asesores || [];
    renderTopAsesores(asesoresCache);
    renderAsesores(asesoresCache);
  } catch (error) {
    console.error("Error al cargar asesores:", error);
    document.getElementById("listaAsesores").innerHTML = `
      <div class="empty-state">Error al cargar asesores.</div>
    `;
  }
}

// Se encarga de solicitar asesoria en esta pantalla y mantiene conectada la vista con el backend.
async function solicitarAsesoria(idAsesor) {
  if (alumnoNoVerificado()) {
    mostrarMensajePrincipal(
      "Tu cuenta debe estar verificada para solicitar asesorías."
    );

    if (window.EduQuakUI) {
      window.EduQuakUI.warning(
        "Cuenta no verificada",
        "Tu cuenta debe estar verificada para solicitar asesorías."
      );
    }
    return;
  }

  const input = document.getElementById(`msg-${idAsesor}`);
  const mensaje = input ? input.value.trim() : "";

  try {
    const res = await fetch(`${API}/api/asesorias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id_asesor: idAsesor,
        mensaje
      })
    });

    const data = await res.json();
    console.log("Solicitud asesoría:", data);

    if (!data.ok) {
      mostrarMensajePrincipal(data.message || "No se pudo enviar la solicitud.");

      if (window.EduQuakUI) {
        window.EduQuakUI.error(
          "No se pudo enviar",
          data.message || "No se pudo enviar la solicitud."
        );
      }
      return;
    }

    mostrarMensajePrincipal("");

    if (window.EduQuakUI) {
      window.EduQuakUI.toast(
        "success",
        "Solicitud de asesoría enviada"
      );
    }

    if (input) input.value = "";
  } catch (error) {
    console.error("Error al solicitar asesoría:", error);
    mostrarMensajePrincipal("Error al solicitar asesoría.");

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Error",
        "Error al solicitar asesoría."
      );
    }
  }
}

// Este listener responde al evento "input" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("busquedaAsesor")?.addEventListener("input", (e) => {
  if (alumnoNoVerificado()) return;

  const texto = e.target.value.trim().toLowerCase();

  if (!texto) {
    renderAsesores(asesoresCache);
    return;
  }

  const filtrados = asesoresCache.filter((asesor) => {
    const nombre = (asesor.nombre || "").toLowerCase();
    const especialidad = (asesor.especialidad || "").toLowerCase();
    const materias = (asesor.materias || "").toLowerCase();
    const institucion = (asesor.institucion || "").toLowerCase();

    return (
      nombre.includes(texto) ||
      especialidad.includes(texto) ||
      materias.includes(texto) ||
      institucion.includes(texto)
    );
  });

  renderAsesores(filtrados);
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
    renderEstadoBloqueado();
    return;
  }

  inicializarTopAsesoresAlumno();
  cargarAsesores();
}

init();