const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let contadorPreguntas = 0;
let tabCuestionariosActiva = "nuevo";

if (!token) {
  window.location.href = "/pages/login.html";
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


function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ocultarMensaje() {
  const box = document.getElementById("mensajeCuestionario");
  box.textContent = "";
  box.classList.add("hidden");
}

function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeCuestionario");
  box.textContent = texto;
  box.classList.remove("hidden");
}

function estadoClase(estado) {
  const valor = (estado || "").toLowerCase();

  if (valor === "aprobado") return "aprobado";
  if (valor === "rechazado") return "rechazado";
  return "pendiente";
}

function cambiarTabCuestionarios(tab) {
  tabCuestionariosActiva = tab;

  const btnNuevo = document.getElementById("tabBtnNuevoCuestionario");
  const btnMis = document.getElementById("tabBtnMisCuestionarios");
  const panelNuevo = document.getElementById("panelTabNuevoCuestionario");
  const panelMis = document.getElementById("panelTabMisCuestionarios");

  const esNuevo = tab === "nuevo";

  btnNuevo.classList.toggle("active", esNuevo);
  btnMis.classList.toggle("active", !esNuevo);

  btnNuevo.setAttribute("aria-selected", esNuevo ? "true" : "false");
  btnMis.setAttribute("aria-selected", esNuevo ? "false" : "true");

  panelNuevo.classList.toggle("hidden", !esNuevo);
  panelNuevo.classList.toggle("active", esNuevo);

  panelMis.classList.toggle("hidden", esNuevo);
  panelMis.classList.toggle("active", !esNuevo);
}

function crearBloquePregunta() {
  contadorPreguntas += 1;

  const card = document.createElement("article");
  card.className = "pregunta-card";
  card.dataset.index = contadorPreguntas;

  card.innerHTML = `
    <div class="pregunta-top">
      <h4>Pregunta ${contadorPreguntas}</h4>
      <button type="button" class="btn danger btnEliminarPregunta">Eliminar</button>
    </div>

    <div class="input-group">
      <label>Pregunta</label>
      <input type="text" class="pregunta-texto" placeholder="Escribe la pregunta" required>
    </div>

    <div class="opciones-grid">
      <div class="input-group">
        <label>Opción A</label>
        <input type="text" class="opcion-a" required>
      </div>

      <div class="input-group">
        <label>Opción B</label>
        <input type="text" class="opcion-b" required>
      </div>

      <div class="input-group">
        <label>Opción C</label>
        <input type="text" class="opcion-c" required>
      </div>

      <div class="input-group">
        <label>Opción D</label>
        <input type="text" class="opcion-d" required>
      </div>
    </div>

    <div class="input-group correcta-box">
      <label>Respuesta correcta</label>
      <select class="respuesta-correcta" required>
        <option value="">Selecciona una opción</option>
        <option value="A">Opción A</option>
        <option value="B">Opción B</option>
        <option value="C">Opción C</option>
        <option value="D">Opción D</option>
      </select>
    </div>
  `;

  card.querySelector(".btnEliminarPregunta").addEventListener("click", () => {
    card.remove();
    renumerarPreguntas();
  });

  document.getElementById("contenedorPreguntas").appendChild(card);
}

function renumerarPreguntas() {
  const preguntas = document.querySelectorAll(".pregunta-card");
  preguntas.forEach((card, index) => {
    card.querySelector("h4").textContent = `Pregunta ${index + 1}`;
  });
}

function obtenerPreguntasDelFormulario() {
  const cards = document.querySelectorAll(".pregunta-card");

  return Array.from(cards).map((card) => ({
    pregunta: card.querySelector(".pregunta-texto").value.trim(),
    opcion_a: card.querySelector(".opcion-a").value.trim(),
    opcion_b: card.querySelector(".opcion-b").value.trim(),
    opcion_c: card.querySelector(".opcion-c").value.trim(),
    opcion_d: card.querySelector(".opcion-d").value.trim(),
    respuesta_correcta: card.querySelector(".respuesta-correcta").value
  }));
}

function validarPreguntas(preguntas) {
  if (!preguntas.length) {
    return "Debes agregar al menos una pregunta.";
  }

  for (const pregunta of preguntas) {
    if (
      !pregunta.pregunta ||
      !pregunta.opcion_a ||
      !pregunta.opcion_b ||
      !pregunta.opcion_c ||
      !pregunta.opcion_d ||
      !pregunta.respuesta_correcta
    ) {
      return "Completa todos los campos de cada pregunta.";
    }
  }

  return null;
}


async function verCuestionario(idCuestionario) {
  try {
    const res = await fetch(`${API}/api/cuestionarios/mis/${idCuestionario}/preguntas`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      mostrarMensaje(data.message || "No se pudo cargar el cuestionario.");
      return;
    }

    const cuestionario = data.cuestionario || {};
    const preguntas = data.preguntas || [];

    const htmlPreguntas = preguntas.length
      ? preguntas.map((pregunta, index) => `
          <div style="text-align:left;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:12px;">
            <strong>Pregunta ${index + 1}</strong>
            <p>${escaparHTML(pregunta.pregunta)}</p>
            <p><strong>A:</strong> ${escaparHTML(pregunta.opcion_a)}</p>
            <p><strong>B:</strong> ${escaparHTML(pregunta.opcion_b)}</p>
            <p><strong>C:</strong> ${escaparHTML(pregunta.opcion_c)}</p>
            <p><strong>D:</strong> ${escaparHTML(pregunta.opcion_d)}</p>
            <p><strong>Respuesta correcta:</strong> ${escaparHTML(String(pregunta.respuesta_correcta || "").toUpperCase())}</p>
          </div>
        `).join("")
      : "<p>Este cuestionario no tiene preguntas registradas.</p>";

    Swal.fire({
      title: cuestionario.titulo || "Cuestionario",
      html: `
        <div style="text-align:left;">
          <p><strong>Materia:</strong> ${escaparHTML(cuestionario.materia || "-")}</p>
          <p><strong>Estado:</strong> ${escaparHTML(cuestionario.estado_revision || "-")}</p>
          <p><strong>Fecha:</strong> ${formatearFechaCorta(cuestionario.fecha_creacion)}</p>
          ${cuestionario.descripcion ? `<p><strong>Descripción:</strong> ${escaparHTML(cuestionario.descripcion)}</p>` : ""}
          <hr>
          ${htmlPreguntas}
        </div>
      `,
      width: 780,
      confirmButtonText: "Cerrar"
    });
  } catch (error) {
    console.error("Error al ver cuestionario:", error);
    mostrarMensaje("Error al cargar el cuestionario.");
  }
}


async function eliminarCuestionario(idCuestionario, estadoRevision) {
  const estado = (estadoRevision || "").toLowerCase();

  const mensajeConfirmacion =
    estado === "aprobado"
      ? "Este cuestionario ya está visible para los alumnos. ¿Seguro que deseas eliminarlo?"
      : "¿Seguro que quieres eliminar este cuestionario?";

  const confirmado = window.EduQuakUI
    ? await window.EduQuakUI.confirm({
        title: "¿Eliminar cuestionario?",
        text: mensajeConfirmacion,
        confirmText: "Sí, eliminar",
        cancelText: "Cancelar",
        icon: "question",
        confirmButtonColor: "#dc2626"
      })
    : window.confirm(mensajeConfirmacion);

  if (!confirmado) return;

  try {
    const res = await fetch(`${API}/api/cuestionarios/${idCuestionario}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let data;

    try {
      data = await res.json();
    } catch (jsonError) {
      console.error("La respuesta no fue JSON:", jsonError);
      mostrarMensaje("La respuesta del servidor no fue válida.");
      return;
    }

    console.log("Eliminar cuestionario:", data);
    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      if (window.EduQuakUI) {
        window.EduQuakUI.toast("success", "Cuestionario eliminado correctamente");
      }
      await cargarMisCuestionarios();
    }
  } catch (error) {
    console.error("Error al eliminar cuestionario:", error);
    mostrarMensaje("Error al eliminar el cuestionario.");
  }
}

function renderCuestionarios(lista) {
  const contenedor = document.getElementById("listaCuestionariosAsesor");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no has creado cuestionarios.
      </div>
    `;
    return;
  }

  lista.forEach((cuestionario) => {
    const estado = cuestionario.estado_revision || "pendiente";
    const claseEstado = estadoClase(estado);

    const textoEstado =
      estado === "pendiente_revision" ? "pendiente" : estado;

    const card = document.createElement("article");
    card.className = "cuestionario-card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${cuestionario.titulo || "Cuestionario sin título"}</h3>
          <span class="materia-pill">${cuestionario.materia || "Sin materia"}</span>
        </div>
        <span class="estado-pill ${claseEstado}">${textoEstado}</span>
      </div>

      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(cuestionario.fecha_creacion)}</p>
      <p class="info-line"><strong>Preguntas:</strong> ${cuestionario.total_preguntas || 0}</p>

      ${
        cuestionario.descripcion
          ? `
            <div class="descripcion-box">
              ${cuestionario.descripcion}
            </div>
          `
          : ""
      }

      ${
        cuestionario.motivo_revision
          ? `
            <div class="motivo-box">
              <strong>Motivo de rechazo:</strong> ${cuestionario.motivo_revision}
            </div>
          `
          : ""
      }

      <div class="button-row">
        <button class="btn primary" data-ver="${cuestionario.id_cuestionario}">
          Ver cuestionario
        </button>
        <button class="btn danger" data-eliminar="${cuestionario.id_cuestionario}">
          Eliminar
        </button>
      </div>
    `;

    const btnVer = card.querySelector("[data-ver]");
    btnVer.addEventListener("click", () =>
      verCuestionario(cuestionario.id_cuestionario)
    );

    const btnEliminar = card.querySelector("[data-eliminar]");
    btnEliminar.addEventListener("click", () =>
      eliminarCuestionario(cuestionario.id_cuestionario, cuestionario.estado_revision)
    );

    contenedor.appendChild(card);
  });
}

async function cargarMisCuestionarios() {
  try {
    const res = await fetch(`${API}/api/cuestionarios/mis`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let data;

    try {
      data = await res.json();
    } catch (jsonError) {
      console.error("La respuesta no fue JSON:", jsonError);
      mostrarMensaje("La respuesta del servidor no fue válida.");
      return;
    }

    console.log("Mis cuestionarios:", data);

    if (!data.ok) {
      document.getElementById("listaCuestionariosAsesor").innerHTML = `
        <div class="empty-state">No se pudieron cargar tus cuestionarios.</div>
      `;
      return;
    }

    renderCuestionarios(data.cuestionarios || []);
  } catch (error) {
    console.error("Error al cargar cuestionarios:", error);
    document.getElementById("listaCuestionariosAsesor").innerHTML = `
      <div class="empty-state">Error al cargar tus cuestionarios.</div>
    `;
  }
}

document.getElementById("btnAgregarPregunta").addEventListener("click", crearBloquePregunta);

document.getElementById("formCuestionario").addEventListener("submit", async (e) => {
  e.preventDefault();

  const titulo = document.getElementById("tituloCuestionario").value.trim();
  const materia = document.getElementById("materiaCuestionario").value.trim();
  const descripcion = document.getElementById("descripcionCuestionario").value.trim();

  const preguntas = obtenerPreguntasDelFormulario();
  const errorValidacion = validarPreguntas(preguntas);

  if (!titulo || !materia) {
    mostrarMensaje("Título y materia son obligatorios.");
    return;
  }

  if (errorValidacion) {
    mostrarMensaje(errorValidacion);
    return;
  }

  try {
    const res = await fetch(`${API}/api/cuestionarios/crear-completo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo,
        materia,
        descripcion,
        preguntas
      })
    });

    const data = await res.json();
    console.log("Crear cuestionario completo:", data);

    mostrarMensaje(data.message || "Respuesta recibida.");

    if (data.ok) {
      document.getElementById("formCuestionario").reset();
      document.getElementById("contenedorPreguntas").innerHTML = "";
      contadorPreguntas = 0;
      crearBloquePregunta();
      await cargarMisCuestionarios();
      cambiarTabCuestionarios("mis-cuestionarios");
    }
  } catch (error) {
    console.error("Error al crear cuestionario:", error);
    mostrarMensaje("Error al crear el cuestionario.");
  }
});

document.getElementById("tabBtnNuevoCuestionario").addEventListener("click", () => {
  cambiarTabCuestionarios("nuevo");
});

document.getElementById("tabBtnMisCuestionarios").addEventListener("click", () => {
  cambiarTabCuestionarios("mis-cuestionarios");
});

ocultarMensaje();
crearBloquePregunta();
cambiarTabCuestionarios("nuevo");
cargarMisCuestionarios();
