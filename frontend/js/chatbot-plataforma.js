
(function () {
  const API = window.EDUQUAK_API_URL || "";
  const token = localStorage.getItem("token");

  const state = {
    abierto: false,
    rol: String(localStorage.getItem("rol") || localStorage.getItem("role") || "").toLowerCase()
  };

  const respuestas = [
    {
      keys: ["validacion", "validación", "verificado", "verificar", "documento", "constancia", "credencial"],
      answer: "Para usar todas las funciones, tu cuenta debe estar validada. Alumno: sube constancia o documento escolar. Asesor: sube documento de respaldo profesional. El admin revisa y aprueba o rechaza."
    },
    {
      keys: ["asesoria", "asesoría", "solicitar", "asesor", "sesion", "sesión", "individual"],
      answer: "Como alumno, entra a Buscar asesores, elige un asesor y envía una solicitud. Como asesor, revisa Solicitudes, asigna fecha y hora, y acepta o rechaza."
    },
    {
      keys: ["grupal", "grupales", "cupo", "cupos", "inscribirme", "inscripcion", "inscripción"],
      answer: "Las asesorías grupales tienen cupos. El alumno puede inscribirse o salirse mientras haya disponibilidad. El asesor puede revisar inscritos y finalizar la sesión."
    },
    {
      keys: ["chat", "mensaje", "mensajes"],
      answer: "El chat aparece solo cuando la asesoría está aceptada. Sirve para comunicación entre alumno y asesor dentro de esa sesión."
    },
    {
      keys: ["videollamada", "video", "jitsi", "reunion", "reunión"],
      answer: "La videollamada se habilita en asesorías aceptadas. El alumno entra con permisos limitados y el asesor conserva controles de moderación."
    },
    {
      keys: ["material", "materiales", "archivo", "pdf"],
      answer: "Los asesores pueden subir materiales. El admin los revisa antes de publicarlos. Los alumnos solo ven materiales aprobados."
    },
    {
      keys: ["cuestionario", "cuestionarios", "preguntas", "responder"],
      answer: "Los asesores crean cuestionarios y el admin los valida. Los alumnos pueden resolver los cuestionarios aprobados y ver sus resultados."
    },
    {
      keys: ["calificar", "calificacion", "calificación", "reseña", "resena", "estrellas"],
      answer: "El alumno puede calificar una asesoría cuando ya está finalizada. Esa calificación ayuda al promedio del asesor."
    },
    {
      keys: ["reporte", "reportar", "problema", "incidencia"],
      answer: "Los reportes sirven para avisar problemas con asesorías o usuarios. El admin puede revisarlos desde su panel."
    },
    {
      keys: ["contraseña", "password", "clave", "perfil"],
      answer: "Puedes cambiar tu contraseña desde Mi perfil. También puedes actualizar algunos datos personales; el correo normalmente queda fijo."
    }
  ];

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function obtenerRol() {
    try {
      if (token) {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.ok && data.user && data.user.rol) {
          state.rol = String(data.user.rol).toLowerCase();
          localStorage.setItem("rol", state.rol);
          localStorage.setItem("role", state.rol);
          return state.rol;
        }
      }
    } catch (error) {
      console.warn("No se pudo obtener rol para chatbot:", error);
    }

    const subtitle =
      document.querySelector(".logo-subtitle")?.textContent?.trim()?.toLowerCase() || "";

    if (subtitle.includes("asesor")) {
      state.rol = "asesor";
    } else if (subtitle.includes("alumno")) {
      state.rol = "alumno";
    } else {
      state.rol = String(state.rol || "alumno").toLowerCase();
    }

    return state.rol;
  }

  function ensureChatbot() {
    if (document.getElementById("eduquakBot")) return;

    const wrapper = document.createElement("section");
    wrapper.id = "eduquakBot";
    wrapper.className = "eduquak-bot cerrado";
    wrapper.innerHTML = `
      <button id="eduquakBotToggle" class="eduquak-bot-toggle" type="button">
        <span>?</span>
        <strong>Ayuda</strong>
      </button>

      <article class="eduquak-bot-panel" aria-live="polite">
        <header class="eduquak-bot-header">
          <div>
            <span class="eduquak-bot-badge">Ayuda EduQuak</span>
            <h3>Chatbot de plataforma</h3>
            <p>Solo respondo dudas sobre EduQuak.</p>
          </div>

          <button id="eduquakBotClose" class="eduquak-bot-close" type="button">×</button>
        </header>

        <div id="eduquakBotMessages" class="eduquak-bot-messages">
          <div class="eduquak-bot-msg bot">
            Hola 👋 Soy el asistente de EduQuak. Puedo ayudarte con registro, validación, asesorías, chat, videollamadas, materiales o cuestionarios.
          </div>
        </div>

        <div class="eduquak-bot-chips">
          <button type="button" data-bot-question="¿Cómo funciona la validación?">Validación</button>
          <button type="button" data-bot-question="¿Cómo solicito una asesoría?">Asesorías</button>
          <button type="button" data-bot-question="¿Cómo funciona la videollamada?">Videollamada</button>
        </div>

        <form id="eduquakBotForm" class="eduquak-bot-form">
          <input id="eduquakBotInput" type="text" placeholder="Pregunta sobre EduQuak..." autocomplete="off">
          <button type="submit">Enviar</button>
        </form>
      </article>
    `;

    document.body.appendChild(wrapper);

    document
      .getElementById("eduquakBotToggle")
      .addEventListener("click", abrirCerrar);

    document
      .getElementById("eduquakBotClose")
      .addEventListener("click", cerrar);

    document
      .getElementById("eduquakBotForm")
      .addEventListener("submit", enviarPregunta);

    document
      .querySelectorAll("[data-bot-question]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          responder(btn.dataset.botQuestion);
        });
      });
  }

  function aplicarTema() {
    const wrapper = document.getElementById("eduquakBot");
    if (!wrapper) return;

    const rol = String(state.rol || "").toLowerCase();
    wrapper.classList.toggle("tema-asesor", rol === "asesor");
    wrapper.classList.toggle("tema-alumno", rol !== "asesor");
  }

  function abrirCerrar() {
    state.abierto = !state.abierto;
    document
      .getElementById("eduquakBot")
      .classList.toggle("cerrado", !state.abierto);

    if (state.abierto) {
      setTimeout(() => {
        document.getElementById("eduquakBotInput")?.focus();
      }, 80);
    }
  }

  function cerrar() {
    state.abierto = false;
    document
      .getElementById("eduquakBot")
      .classList.add("cerrado");
  }

  function agregarMensaje(texto, tipo) {
    const contenedor = document.getElementById("eduquakBotMessages");
    const msg = document.createElement("div");

    msg.className = `eduquak-bot-msg ${tipo}`;
    msg.textContent = texto;

    contenedor.appendChild(msg);
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  function buscarRespuesta(pregunta) {
    const limpia = normalizar(pregunta);

    const match = respuestas.find((item) =>
      item.keys.some((key) => limpia.includes(normalizar(key)))
    );

    if (match) {
      return match.answer;
    }

    return "Solo puedo ayudarte con dudas sobre la plataforma EduQuak. Prueba preguntar por validación, asesorías, chat, videollamada, materiales o cuestionarios.";
  }

  function responder(pregunta) {
    if (!pregunta.trim()) return;

    agregarMensaje(pregunta, "user");

    setTimeout(() => {
      agregarMensaje(buscarRespuesta(pregunta), "bot");
    }, 260);
  }

  function enviarPregunta(e) {
    e.preventDefault();

    const input = document.getElementById("eduquakBotInput");
    const pregunta = input.value.trim();

    if (!pregunta) return;

    input.value = "";
    responder(pregunta);
  }

  async function init() {
    ensureChatbot();
    await obtenerRol();
    aplicarTema();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
