const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

const params = new URLSearchParams(window.location.search);
const idAsesoria = params.get("id");

let ultimoRender = "";
let cargando = false;

function ajustarAlturaInput() {
  const input = document.getElementById("mensajeInput");
  if (!input) return;

  input.style.height = "44px";
  const nuevaAltura = Math.min(input.scrollHeight, 92);
  input.style.height = `${Math.max(44, nuevaAltura)}px`;
}


if (!token) {
  window.location.href = "/pages/login.html";
}

if (!idAsesoria) {
  document.body.innerHTML = "<p>Falta el ID de la asesoría.</p>";
}

function escapeHTML(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return String(fecha);
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mostrarEstado(texto) {
  const estado = document.getElementById("estadoChat");
  estado.textContent = texto;
  estado.classList.remove("hidden");
}

function ocultarEstado() {
  const estado = document.getElementById("estadoChat");
  estado.textContent = "";
  estado.classList.add("hidden");
}

function renderMensajes(mensajes) {
  const contenedor = document.getElementById("mensajesChat");

  const firma = JSON.stringify(
    (mensajes || []).map((m) => [
      m.id_mensaje,
      m.mensaje,
      m.fecha_envio
    ])
  );

  if (firma === ultimoRender) {
    return;
  }

  ultimoRender = firma;
  contenedor.innerHTML = "";

  if (!mensajes || mensajes.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no hay mensajes.
      </div>
    `;
    return;
  }

  mensajes.forEach((item) => {
    const mensaje = document.createElement("article");
    mensaje.className = `mensaje ${item.propio ? "propio" : "ajeno"}`;

    mensaje.innerHTML = `
      <div class="mensaje-meta">
        ${escapeHTML(item.nombre_emisor || "Usuario")}
        · ${escapeHTML(item.rol_emisor || "")}
        · ${escapeHTML(formatearFecha(item.fecha_envio))}
      </div>

      <div class="mensaje-burbuja">
        ${escapeHTML(item.mensaje)}
      </div>
    `;

    contenedor.appendChild(mensaje);
  });

  contenedor.scrollTop = contenedor.scrollHeight;
}

function renderInfo(asesoria) {
  const chatTitulo = document.getElementById("chatTitulo");
  const chatInfo = document.getElementById("chatInfo");

  if (!asesoria) {
    chatTitulo.textContent = "Chat de asesoría";
    chatInfo.textContent = "Asesoría aceptada";
    return;
  }

  const otroUsuario = asesoria.otro_usuario || {};
  const nombreOtro = otroUsuario.nombre || "Participante";
const rolOtro = (otroUsuario.rol || "usuario").toLowerCase();
const rolLabel = rolOtro === "asesor" ? "Asesor" : rolOtro === "alumno" ? "Alumno" : "Usuario";

  chatTitulo.textContent = `Chat con ${nombreOtro}`;
  chatInfo.textContent = `Asesoría ${asesoria.tipo || ""} · ${asesoria.fecha || "sin fecha"} · ${asesoria.hora || "sin hora"}`;
}

async function cargarMensajes() {
  if (cargando || !idAsesoria) {
    return;
  }

  cargando = true;

  try {
    const res = await fetch(`${API}/api/chat/${idAsesoria}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.ok) {
      mostrarEstado(data.message || "No se pudo cargar el chat.");
      document.getElementById("formChat").classList.add("hidden");
      return;
    }

    ocultarEstado();
    renderInfo(data.asesoria);
    renderMensajes(data.mensajes || []);
    document.dispatchEvent(new CustomEvent("eduquak:chat-read"));
  } catch (error) {
    console.error(error);
    mostrarEstado("Error al cargar el chat.");
  } finally {
    cargando = false;
  }
}

async function enviarMensaje(e) {
  e.preventDefault();

  const input = document.getElementById("mensajeInput");
  const mensaje = input.value.trim();

  if (!mensaje) {
    return;
  }

  try {
    const res = await fetch(`${API}/api/chat/${idAsesoria}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mensaje })
    });

    const data = await res.json();

    if (!data.ok) {
      mostrarEstado(data.message || "No se pudo enviar el mensaje.");
      return;
    }

    input.value = "";
    ajustarAlturaInput();
    await cargarMensajes();
  } catch (error) {
    console.error(error);
    mostrarEstado("Error al enviar el mensaje.");
  }
}

const mensajeInput = document.getElementById("mensajeInput");
mensajeInput.addEventListener("input", ajustarAlturaInput);
mensajeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("formChat").requestSubmit();
  }
});

document.getElementById("formChat").addEventListener("submit", enviarMensaje);

document.getElementById("btnVolver").addEventListener("click", () => {
  history.back();
});

cargarMensajes();
setInterval(cargarMensajes, 3000);
