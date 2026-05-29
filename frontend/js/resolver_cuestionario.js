// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const idCuestionario = params.get("id");

let preguntasActuales = [];
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

// Se encarga de mostrar preguntas en esta pantalla y mantiene conectada la vista con el backend.
function renderPreguntas(preguntas) {

  const contenedor =
    document.getElementById("preguntasContainer");

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

    card.setAttribute(
      "data-pregunta-id",
      pregunta.id_pregunta
    );

    card.innerHTML = `
      <span class="pregunta-numero">
        Pregunta ${index + 1}
      </span>

      <h3 class="pregunta-texto">
        ${pregunta.pregunta}
      </h3>

      <div class="opciones-list">

        ${crearOpcion(
          pregunta.id_pregunta,
          "A",
          pregunta.opcion_a
        )}

        ${crearOpcion(
          pregunta.id_pregunta,
          "B",
          pregunta.opcion_b
        )}

        ${crearOpcion(
          pregunta.id_pregunta,
          "C",
          pregunta.opcion_c
        )}

        ${crearOpcion(
          pregunta.id_pregunta,
          "D",
          pregunta.opcion_d
        )}

      </div>
    `;

    contenedor.appendChild(card);

  });

}

// Se encarga de crear opcion en esta pantalla y mantiene conectada la vista con el backend.
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
          ${texto}
        </span>

      </span>

    </label>
  `;

}

// Se encarga de generar la gráfica de resultados del cuestionario.
function renderGrafica(correctas, incorrectas) {

  const ctx =
    document.getElementById(
      "graficaResultados"
    );

  if (!ctx) return;

  if (graficaResultados) {
    graficaResultados.destroy();
  }

  graficaResultados = new Chart(ctx, {

    type: "doughnut",

    data: {

      labels: [
        "Correctas",
        "Incorrectas"
      ],

      datasets: [
        {
          data: [
            correctas,
            incorrectas
          ],

          backgroundColor: [
            "#22c55e",
            "#ef4444"
          ],

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

// Limpia colores anteriores si se vuelve a enviar.
function limpiarColoresRespuestas() {

  document
    .querySelectorAll(".opcion-item")
    .forEach((opcion) => {

      opcion.classList.remove(
        "respuesta-correcta",
        "respuesta-incorrecta",
        "respuesta-correcta-real"
      );

    });

}

// Bloquea las respuestas después de enviar.
function bloquearRespuestas() {

  document
    .querySelectorAll(
      "#preguntasContainer input[type='radio']"
    )
    .forEach((input) => {

      input.disabled = true;

    });

}

// Se encarga de cargar preguntas en esta pantalla y mantiene conectada la vista con el backend.
async function cargarPreguntas() {

  try {

    const res = await fetch(
      `${API}/api/cuestionarios/${idCuestionario}/preguntas`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    console.log("Preguntas:", data);

    if (!data.ok) {

      document.getElementById(
        "preguntasContainer"
      ).innerHTML = `
        <div class="empty-state">
          ${data.message || "No se pudieron cargar las preguntas."}
        </div>
      `;

      document.getElementById(
        "btnEnviar"
      ).disabled = true;

      return;
    }

    document.getElementById(
      "tituloCuestionario"
    ).textContent =
      data.cuestionario?.titulo || "Cuestionario";

    preguntasActuales =
      data.preguntas || [];

    renderPreguntas(
      preguntasActuales
    );

  } catch (error) {

    console.error(
      "Error al cargar preguntas:",
      error
    );

    document.getElementById(
      "preguntasContainer"
    ).innerHTML = `
      <div class="empty-state">
        Error al cargar las preguntas.
      </div>
    `;

    document.getElementById(
      "btnEnviar"
    ).disabled = true;

  }

}

// Se encarga de enviar respuestas en esta pantalla y mantiene conectada la vista con el backend.
async function enviarRespuestas() {

  if (!preguntasActuales.length) return;

  limpiarColoresRespuestas();

  const respuestas =
    preguntasActuales.map((p) => {

      const seleccionada =
        document.querySelector(
          `input[name="pregunta_${p.id_pregunta}"]:checked`
        );

      return {
        id_pregunta: p.id_pregunta,
        respuesta: seleccionada
          ? seleccionada.value
          : null
      };

    });

  try {

    const res = await fetch(
      `${API}/api/cuestionarios/${idCuestionario}/responder`,
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },

        body: JSON.stringify({
          respuestas
        })

      }
    );

    const data = await res.json();

    console.log("Resultado:", data);

    if (!data.ok) {

      alert(
        data.message ||
        "No se pudo enviar el cuestionario."
      );

      return;
    }

    const resultado =
      data.resultado || {};

    const detalleResultados =
      resultado.detalle || [];

    const incorrectas =
      (resultado.total || 0) -
      (resultado.correctas || 0);

    renderGrafica(
      resultado.correctas || 0,
      incorrectas
    );

    // ===== PINTAR RESPUESTAS =====

    document
      .querySelectorAll(
        ".opcion-item"
      )
      .forEach((opcion) => {
        opcion.classList.remove(
          "respuesta-correcta",
          "respuesta-incorrecta",
          "respuesta-correcta-real"
        );
      });

    detalleResultados.forEach((r) => {

      const respuestaAlumno =
        r.respuesta_alumno || "";

      const respuestaCorrecta =
        r.respuesta_correcta || "";

      const inputSeleccionado =
        respuestaAlumno
          ? document.querySelector(
              `input[name="pregunta_${r.id_pregunta}"][value="${respuestaAlumno}"]`
            )
          : null;

      const inputCorrecto =
        respuestaCorrecta
          ? document.querySelector(
              `input[name="pregunta_${r.id_pregunta}"][value="${respuestaCorrecta}"]`
            )
          : null;

      if (inputSeleccionado) {

        const opcionSeleccionada =
          inputSeleccionado.closest(
            ".opcion-item"
          );

        if (r.es_correcta) {

          opcionSeleccionada?.classList.add(
            "respuesta-correcta"
          );

        } else {

          opcionSeleccionada?.classList.add(
            "respuesta-incorrecta"
          );

        }

      }

      if (
        inputCorrecto &&
        !r.es_correcta
      ) {

        const opcionCorrecta =
          inputCorrecto.closest(
            ".opcion-item"
          );

        opcionCorrecta?.classList.add(
          "respuesta-correcta-real"
        );

      }

    });

    bloquearRespuestas();

    document.getElementById(
      "btnEnviar"
    ).disabled = true;

    // ===== RESULTADOS =====

    document.getElementById(
      "resultadoCorrectas"
    ).textContent =
      resultado.correctas ?? "-";

    document.getElementById(
      "resultadoTotal"
    ).textContent =
      resultado.total ?? "-";

    document.getElementById(
      "resultadoPuntaje"
    ).textContent =
      `${resultado.puntaje ?? "-"}%`;

    document.getElementById(
      "resultadoBox"
    ).classList.remove("hidden");

    document.getElementById(
      "resultadoBox"
    ).scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    console.error(
      "Error al responder cuestionario:",
      error
    );

    alert(
      "Error al responder el cuestionario."
    );

  }

}

// Este listener responde al evento "click" y mantiene la pantalla sincronizada con lo que hace el usuario.
document
  .getElementById("btnEnviar")
  .addEventListener(
    "click",
    enviarRespuestas
  );

if (idCuestionario) {
  cargarPreguntas();
}