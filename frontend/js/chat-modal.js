
(function () {
  const API = window.EDUQUAK_API_URL || "";
  const token = localStorage.getItem("token");

  const state = {
    idAsesoria: null,
    intervalo: null,
    cargando: false,
    ultimoRender: "",
    rolActual: localStorage.getItem("rol") || localStorage.getItem("role") || ""
  };

  function escapeHTML(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatearFecha(fecha) {
    if (!fecha) return "";
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return String(fecha);

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getRefs() {
    return {
      overlay: document.getElementById("chatModalOverlay"),
      title: document.getElementById("chatModalTitle"),
      info: document.getElementById("chatModalInfo"),
      status: document.getElementById("chatModalStatus"),
      messages: document.getElementById("chatModalMessages"),
      form: document.getElementById("chatModalForm"),
      textarea: document.getElementById("chatModalInput"),
      send: document.getElementById("chatModalSend"),
      close: document.getElementById("chatModalClose")
    };
  }

  async function obtenerRolActual() {
    if (state.rolActual) {
      return state.rolActual;
    }

    try {
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.ok && data.user && data.user.rol) {
        state.rolActual = data.user.rol;
        localStorage.setItem("rol", data.user.rol);
      }
    } catch (error) {
      console.warn("No se pudo obtener rol para tema del chat:", error);
    }

    return state.rolActual;
  }

  function aplicarTemaChat() {
    const { overlay } = getRefs();
    if (!overlay) return;

    const rol = String(state.rolActual || "").toLowerCase();
    overlay.classList.toggle("chat-modal-asesor", rol === "asesor");
    overlay.classList.toggle("chat-modal-alumno", rol !== "asesor");
  }

  function ensureModal() {
    if (document.getElementById("chatModalOverlay")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "chatModalOverlay";
    wrapper.className = "chat-modal-overlay hidden";
    wrapper.innerHTML = `
      <section class="chat-modal" role="dialog" aria-modal="true" aria-labelledby="chatModalTitle">
        <header class="chat-modal-header">
          <div>
            <span class="chat-modal-badge">Chat de asesoría</span>
            <h2 id="chatModalTitle" class="chat-modal-title">Comunicación de la sesión</h2>
            <p id="chatModalInfo" class="chat-modal-info">Cargando información...</p>
          </div>

          <button id="chatModalClose" class="chat-modal-close" type="button">✕ Cerrar</button>
        </header>

        <section id="chatModalStatus" class="chat-modal-status hidden"></section>

        <section id="chatModalMessages" class="chat-modal-messages">
          <div class="chat-modal-empty">Cargando mensajes...</div>
        </section>

        <form id="chatModalForm" class="chat-modal-form">
          <textarea id="chatModalInput" placeholder="Escribe tu mensaje..." maxlength="1000" required></textarea>
          <button id="chatModalSend" class="chat-modal-send" type="submit">Enviar</button>
        </form>
      </section>
    `;

    document.body.appendChild(wrapper);

    wrapper.addEventListener("click", (e) => {
      if (e.target === wrapper) {
        cerrar();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !wrapper.classList.contains("hidden")) {
        cerrar();
      }
    });

    const refs = getRefs();
    aplicarTemaChat();
    refs.close.addEventListener("click", cerrar);
    refs.form.addEventListener("submit", enviarMensaje);

    refs.textarea.addEventListener("input", () => {
      refs.textarea.style.height = "auto";
      refs.textarea.style.height = Math.min(refs.textarea.scrollHeight, 120) + "px";
    });

    refs.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        refs.form.requestSubmit();
      }
    });
  }

  function mostrarEstado(texto) {
    const { status } = getRefs();
    status.textContent = texto;
    status.classList.remove("hidden");
  }

  function ocultarEstado() {
    const { status } = getRefs();
    status.textContent = "";
    status.classList.add("hidden");
  }

  function renderInfo(asesoria) {
    const { title, info } = getRefs();

    if (!asesoria) {
      title.textContent = "Chat de asesoría";
      info.textContent = "Asesoría aceptada";
      return;
    }

    const otroUsuario = asesoria.otro_usuario || {};
    const nombreOtro = otroUsuario.nombre || "Participante";

    title.textContent = `Chat con ${nombreOtro}`;
    info.textContent = `Asesoría ${asesoria.tipo || ""} · ${asesoria.fecha || "sin fecha"} · ${asesoria.hora || "sin hora"}`;
  }

  function renderMensajes(mensajes) {
    const { messages } = getRefs();

    const firma = JSON.stringify((mensajes || []).map((m) => [m.id_mensaje, m.mensaje, m.fecha_envio]));
    if (firma === state.ultimoRender) return;

    state.ultimoRender = firma;
    messages.innerHTML = "";

    if (!mensajes || mensajes.length === 0) {
      messages.innerHTML = `<div class="chat-modal-empty">Aún no hay mensajes.</div>`;
      return;
    }

    mensajes.forEach((item) => {
      const articulo = document.createElement("article");
      articulo.className = `chat-modal-message ${item.propio ? "own" : "other"}`;
      articulo.innerHTML = `
        <div class="chat-modal-meta">
          ${escapeHTML(item.nombre_emisor || "Usuario")}
          · ${escapeHTML(item.rol_emisor || "")}
          · ${escapeHTML(formatearFecha(item.fecha_envio))}
        </div>
        <div class="chat-modal-bubble">${escapeHTML(item.mensaje)}</div>
      `;
      messages.appendChild(articulo);
    });

    messages.scrollTop = messages.scrollHeight;
  }

  async function cargarMensajes() {
    if (state.cargando || !state.idAsesoria) return;
    state.cargando = true;

    try {
      const res = await fetch(`${API}/api/chat/${state.idAsesoria}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!data.ok) {
        mostrarEstado(data.message || "No se pudo cargar el chat.");
        const { form } = getRefs();
        form.style.display = "none";
        return;
      }

      const { form } = getRefs();
      form.style.display = "grid";
      ocultarEstado();
      renderInfo(data.asesoria);
      renderMensajes(data.mensajes || []);
      document.dispatchEvent(new CustomEvent("eduquak:chat-read"));
    } catch (error) {
      console.error(error);
      mostrarEstado("Error al cargar el chat.");
    } finally {
      state.cargando = false;
    }
  }

  async function enviarMensaje(e) {
    e.preventDefault();

    const refs = getRefs();
    const mensaje = refs.textarea.value.trim();
    if (!mensaje || !state.idAsesoria) return;

    refs.send.disabled = true;

    try {
      const res = await fetch(`${API}/api/chat/${state.idAsesoria}`, {
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

      refs.textarea.value = "";
      state.ultimoRender = "";
      await cargarMensajes();
      refs.textarea.focus();
    } catch (error) {
      console.error(error);
      mostrarEstado("Error al enviar el mensaje.");
    } finally {
      refs.send.disabled = false;
    }
  }

  async function abrir(idAsesoria) {
    if (!token) {
      window.location.href = "/pages/login.html";
      return;
    }

    ensureModal();
    await obtenerRolActual();
    aplicarTemaChat();

    const refs = getRefs();

    state.idAsesoria = idAsesoria;
    state.ultimoRender = "";
    refs.messages.innerHTML = `<div class="chat-modal-empty">Cargando mensajes...</div>`;
    refs.title.textContent = "Comunicación de la sesión";
    refs.info.textContent = "Cargando información...";
    refs.textarea.value = "";
    refs.form.style.display = "grid";
    ocultarEstado();

    refs.overlay.classList.remove("hidden");
    document.body.classList.add("chat-open");

    cargarMensajes();
    clearInterval(state.intervalo);
    state.intervalo = setInterval(cargarMensajes, 3000);

    if (window.matchMedia("(min-width: 769px)").matches) {
      setTimeout(() => refs.textarea.focus(), 80);
    }
  }

  function cerrar() {
    const { overlay } = getRefs();
    if (!overlay) return;

    overlay.classList.add("hidden");
    document.body.classList.remove("chat-open");
    clearInterval(state.intervalo);
    state.intervalo = null;
    state.idAsesoria = null;
    state.cargando = false;
  }

  window.EduQuakChatModal = {
    open: abrir,
    close: cerrar
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureModal);
  } else {
    ensureModal();
  }
})();
