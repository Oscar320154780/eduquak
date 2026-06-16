const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const idCuestionario = params.get("id");

let preguntasActuales = [];
let cuestionarioActual = null;
let ultimoDetalleResultados = [];
let graficaResultados = null;

if (!token) {
  window.location.href = "/pages/login.html";
}

if (!idCuestionario) {
  document.getElementById("preguntasContainer").innerHTML = `
    <div class="empty-state">No se encontró el ID del cuestionario.</div>
  `;

  document.getElementById("btnEnviar").disabled = true;
}

function escaparHTML(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obtenerTextoOpcion(pregunta, letra) {
  if (!letra) return "Sin responder";

  const clave = `opcion_${String(letra).toLowerCase()}`;
  return pregunta?.[clave] || "Opción no encontrada";
}

function formatearRespuesta(letra, texto) {
  if (!letra) return "Sin responder";
  return `${letra}) ${texto}`;
}


function formatearParrafoIA(texto) {
  return escaparHTML(texto)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function crearMensajeIA(tipo, mensaje) {
  const clases = {
    carga: "ia-mensaje-carga",
    error: "ia-mensaje-error"
  };

  return `
    <div class="${clases[tipo] || "ia-mensaje-carga"}">
      <span class="ia-mensaje-icono">${tipo === "error" ? "!" : "✦"}</span>
      <span>${escaparHTML(mensaje)}</span>
    </div>
  `;
}

function formatearExplicacionIA(texto) {
  const limpio = String(texto || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();

  if (!limpio) {
    return crearMensajeIA("error", "No se generó explicación.");
  }

  const secciones = [
    {
      titulo: "Por qué estuvo mal",
      icono: "01",
      clase: "ia-seccion-error",
      regex: /(?:^|\n)\s*(?:1\.\s*)?Por qué estuvo mal:\s*/i
    },
    {
      titulo: "Respuesta correcta",
      icono: "02",
      clase: "ia-seccion-correcta",
      regex: /(?:^|\n)\s*(?:2\.\s*)?Respuesta correcta:\s*/i
    },
    {
      titulo: "Explicación rápida",
      icono: "03",
      clase: "ia-seccion-explicacion",
      regex: /(?:^|\n)\s*(?:3\.\s*)?Explicación rápida:\s*/i
    },
    {
      titulo: "Consejo para recordarlo",
      icono: "04",
      clase: "ia-seccion-consejo",
      regex: /(?:^|\n)\s*(?:4\.\s*)?Consejo para recordarlo:\s*/i
    }
  ];

  const marcas = secciones
    .map((seccion) => {
      const match = seccion.regex.exec(limpio);
      if (!match) return null;
      return {
        ...seccion,
        inicio: match.index,
        contenidoInicio: match.index + match[0].length
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.inicio - b.inicio);

  if (!marcas.length) {
    return `
      <div class="ia-explicacion-formateada">
        <div class="ia-intro-card">
          <span>IA</span>
          <p>${formatearParrafoIA(limpio)}</p>
        </div>
      </div>
    `;
  }

  const intro = limpio.slice(0, marcas[0].inicio).trim();

  const tarjetas = marcas
    .map((marca, index) => {
      const siguiente = marcas[index + 1];
      const contenido = limpio
        .slice(marca.contenidoInicio, siguiente ? siguiente.inicio : limpio.length)
        .trim();

      if (!contenido) return "";

      return `
        <article class="ia-explicacion-item ${marca.clase}">
          <div class="ia-explicacion-item-head">
            <span class="ia-explicacion-icono">${marca.icono}</span>
            <h5>${marca.titulo}</h5>
          </div>
          <p>${formatearParrafoIA(contenido)}</p>
        </article>
      `;
    })
    .join("");

  return `
    <div class="ia-explicacion-formateada">
      ${intro ? `
        <div class="ia-intro-card">
          <span>IA</span>
          <p>${formatearParrafoIA(intro)}</p>
        </div>
      ` : ""}
      <div class="ia-explicacion-grid">
        ${tarjetas}
      </div>
    </div>
  `;
}

function renderPreguntas(preguntas) {
  const contenedor = document.getElementById("preguntasContainer");
  contenedor.innerHTML = "";

  if (!preguntas || preguntas.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Este cuestionario no tiene preguntas.
      </div>
    `;

    return;
  }

  preguntas.forEach((pregunta, index) => {
    const card = document.createElement("article");
    card.className = "pregunta-card";
    card.setAttribute("data-pregunta-id", pregunta.id_pregunta);

    card.innerHTML = `
      <span class="pregunta-numero">
        Pregunta ${index + 1}
      </span>

      <h3 class="pregunta-texto">
        ${escaparHTML(pregunta.pregunta)}
      </h3>

      <div class="opciones-list">
        ${crearOpcion(pregunta.id_pregunta, "A", pregunta.opcion_a)}
        ${crearOpcion(pregunta.id_pregunta, "B", pregunta.opcion_b)}
        ${crearOpcion(pregunta.id_pregunta, "C", pregunta.opcion_c)}
        ${crearOpcion(pregunta.id_pregunta, "D", pregunta.opcion_d)}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

function crearOpcion(idPregunta, letra, texto) {
  return `
    <label class="opcion-item">
      <input
        type="radio"
        name="pregunta_${idPregunta}"
        value="${letra}"
      >

      <span class="opcion-label">
        <span class="opcion-letra">
          ${letra})
        </span>

        <span>
          ${escaparHTML(texto)}
        </span>
      </span>
    </label>
  `;
}

function renderGrafica(correctas, incorrectas) {
  const ctx = document.getElementById("graficaResultados");

  if (!ctx) return;

  if (graficaResultados) {
    graficaResultados.destroy();
  }

  graficaResultados = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Correctas", "Incorrectas"],
      datasets: [
        {
          data: [correctas, incorrectas],
          backgroundColor: ["#22c55e", "#ef4444"],
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function limpiarColoresRespuestas() {
  document.querySelectorAll(".opcion-item").forEach((opcion) => {
    opcion.classList.remove(
      "respuesta-correcta",
      "respuesta-incorrecta",
      "respuesta-correcta-real"
    );
  });
}

function bloquearRespuestas() {
  document
    .querySelectorAll("#preguntasContainer input[type='radio']")
    .forEach((input) => {
      input.disabled = true;
    });
}

async function cargarPreguntas() {
  try {
    const res = await fetch(`${API}/api/cuestionarios/${idCuestionario}/preguntas`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      document.getElementById("preguntasContainer").innerHTML = `
        <div class="empty-state">
          ${escaparHTML(data.message || "No se pudieron cargar las preguntas.")}
        </div>
      `;

      document.getElementById("btnEnviar").disabled = true;
      return;
    }

    cuestionarioActual = data.cuestionario || null;

    document.getElementById("tituloCuestionario").textContent =
      cuestionarioActual?.titulo || "Cuestionario";

    preguntasActuales = data.preguntas || [];
    renderPreguntas(preguntasActuales);
  } catch (error) {
    console.error("Error al cargar preguntas:", error);

    document.getElementById("preguntasContainer").innerHTML = `
      <div class="empty-state">
        Error al cargar las preguntas.
      </div>
    `;

    document.getElementById("btnEnviar").disabled = true;
  }
}

function renderExplicacionesIA(detalleResultados) {
  const box = document.getElementById("iaErroresBox");
  const lista = document.getElementById("iaErroresLista");

  if (!box || !lista) return;

  lista.innerHTML = "";

  const errores = (detalleResultados || []).filter((r) => !r.es_correcta);

  if (errores.length === 0) {
    box.classList.add("hidden");
    return;
  }

  errores.forEach((resultado, index) => {
    const pregunta = preguntasActuales.find(
      (p) => Number(p.id_pregunta) === Number(resultado.id_pregunta)
    );

    const respuestaAlumno = resultado.respuesta_alumno || "";
    const respuestaCorrecta = resultado.respuesta_correcta || "";
    const textoAlumno = obtenerTextoOpcion(pregunta, respuestaAlumno);
    const textoCorrecto = obtenerTextoOpcion(pregunta, respuestaCorrecta);

    const card = document.createElement("article");
    card.className = "ia-error-card";
    card.innerHTML = `
      <div class="ia-error-top">
        <span class="ia-error-numero">Error ${index + 1}</span>
        <span class="ia-error-pregunta">Pregunta ${preguntasActuales.indexOf(pregunta) + 1}</span>
      </div>

      <h4>${escaparHTML(pregunta?.pregunta || "Pregunta no encontrada")}</h4>

      <div class="ia-error-respuestas">
        <p><strong>Tu respuesta:</strong> ${escaparHTML(formatearRespuesta(respuestaAlumno, textoAlumno))}</p>
        <p><strong>Correcta:</strong> ${escaparHTML(formatearRespuesta(respuestaCorrecta, textoCorrecto))}</p>
      </div>

      <button
        type="button"
        class="btn-ia-explicar"
        data-pregunta-id="${resultado.id_pregunta}"
      >
        Explicar error con IA
      </button>

      <div
        class="ia-explicacion hidden"
        id="ia_exp_${resultado.id_pregunta}"
      ></div>
    `;

    lista.appendChild(card);
  });

  box.classList.remove("hidden");
}

async function pedirExplicacionIA(idPregunta, boton) {
  const resultado = ultimoDetalleResultados.find(
    (r) => Number(r.id_pregunta) === Number(idPregunta)
  );

  const pregunta = preguntasActuales.find(
    (p) => Number(p.id_pregunta) === Number(idPregunta)
  );

  const contenedor = document.getElementById(`ia_exp_${idPregunta}`);

  if (!resultado || !pregunta || !contenedor) return;

  if (contenedor.dataset.cargado === "true") {
    contenedor.classList.toggle("hidden");
    return;
  }

  const respuestaAlumno = resultado.respuesta_alumno || "";
  const respuestaCorrecta = resultado.respuesta_correcta || "";
  const textoAlumno = obtenerTextoOpcion(pregunta, respuestaAlumno);
  const textoCorrecto = obtenerTextoOpcion(pregunta, respuestaCorrecta);

  try {
    boton.disabled = true;
    boton.textContent = "Generando explicación...";
    contenedor.classList.remove("hidden");
    contenedor.innerHTML = crearMensajeIA("carga", "La IA está analizando tu error...");

    const res = await fetch(`${API}/api/ia/explicar-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        pregunta: pregunta.pregunta,
        respuestaAlumno: formatearRespuesta(respuestaAlumno, textoAlumno),
        respuestaCorrecta: formatearRespuesta(respuestaCorrecta, textoCorrecto),
        materia: cuestionarioActual?.materia || "No especificada",
        tema: cuestionarioActual?.titulo || "Cuestionario"
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      contenedor.innerHTML = crearMensajeIA(
        "error",
        data.message || data.error || "No se pudo generar la explicación con IA."
      );
      return;
    }

    contenedor.innerHTML = formatearExplicacionIA(data.explicacion);
    contenedor.dataset.cargado = "true";
    boton.textContent = "Mostrar / ocultar explicación";
  } catch (error) {
    console.error("Error al pedir explicación IA:", error);
    contenedor.innerHTML = crearMensajeIA("error", "Error de conexión al generar la explicación.");
  } finally {
    boton.disabled = false;
  }
}

async function enviarRespuestas() {
  if (!preguntasActuales.length) return;

  limpiarColoresRespuestas();

  const respuestas = preguntasActuales.map((p) => {
    const seleccionada = document.querySelector(
      `input[name="pregunta_${p.id_pregunta}"]:checked`
    );

    return {
      id_pregunta: p.id_pregunta,
      respuesta: seleccionada ? seleccionada.value : null
    };
  });

  try {
    const res = await fetch(`${API}/api/cuestionarios/${idCuestionario}/responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ respuestas })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "No se pudo enviar el cuestionario.");
      return;
    }

    const resultado = data.resultado || {};
    const detalleResultados = resultado.detalle || [];
    ultimoDetalleResultados = detalleResultados;

    const incorrectas = (resultado.total || 0) - (resultado.correctas || 0);

    renderGrafica(resultado.correctas || 0, incorrectas);

    document.querySelectorAll(".opcion-item").forEach((opcion) => {
      opcion.classList.remove(
        "respuesta-correcta",
        "respuesta-incorrecta",
        "respuesta-correcta-real"
      );
    });

    detalleResultados.forEach((r) => {
      const respuestaAlumno = r.respuesta_alumno || "";
      const respuestaCorrecta = r.respuesta_correcta || "";

      const inputSeleccionado = respuestaAlumno
        ? document.querySelector(
            `input[name="pregunta_${r.id_pregunta}"][value="${respuestaAlumno}"]`
          )
        : null;

      const inputCorrecto = respuestaCorrecta
        ? document.querySelector(
            `input[name="pregunta_${r.id_pregunta}"][value="${respuestaCorrecta}"]`
          )
        : null;

      if (inputSeleccionado) {
        const opcionSeleccionada = inputSeleccionado.closest(".opcion-item");

        if (r.es_correcta) {
          opcionSeleccionada?.classList.add("respuesta-correcta");
        } else {
          opcionSeleccionada?.classList.add("respuesta-incorrecta");
        }
      }

      if (inputCorrecto && !r.es_correcta) {
        const opcionCorrecta = inputCorrecto.closest(".opcion-item");
        opcionCorrecta?.classList.add("respuesta-correcta-real");
      }
    });

    bloquearRespuestas();
    document.getElementById("btnEnviar").disabled = true;

    document.getElementById("resultadoCorrectas").textContent =
      resultado.correctas ?? "-";

    document.getElementById("resultadoTotal").textContent = resultado.total ?? "-";

    document.getElementById("resultadoPuntaje").textContent =
      `${resultado.puntaje ?? "-"}%`;

    renderExplicacionesIA(detalleResultados);

    document.getElementById("resultadoBox").classList.remove("hidden");

    document.getElementById("resultadoBox").scrollIntoView({
      behavior: "smooth"
    });
  } catch (error) {
    console.error("Error al responder cuestionario:", error);
    alert("Error al responder el cuestionario.");
  }
}

document.getElementById("btnEnviar").addEventListener("click", enviarRespuestas);

document.addEventListener("click", (event) => {
  const boton = event.target.closest(".btn-ia-explicar");

  if (!boton) return;

  pedirExplicacionIA(boton.dataset.preguntaId, boton);
});

if (idCuestionario) {
  cargarPreguntas();
}
