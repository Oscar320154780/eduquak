(function () {
  const API = window.EDUQUAK_API_URL || "";
  const token = localStorage.getItem("token");

  let ultimoMapa = {};
  let cargando = false;

  function getButtons() {
    return Array.from(document.querySelectorAll("[data-chat]"));
  }

  function pintarBadge(btn, cantidad) {
    let badge = btn.querySelector(".chat-unread-badge");

    if (!cantidad || cantidad <= 0) {
      if (badge) badge.remove();
      btn.classList.remove("has-unread-chat");
      btn.removeAttribute("aria-label");
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "chat-unread-badge";
      btn.appendChild(badge);
    }

    badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
    btn.classList.add("has-unread-chat");
    btn.setAttribute("aria-label", `Chat con ${cantidad} mensajes no leídos`);
  }

  function aplicarMapa(mapa) {
    getButtons().forEach((btn) => {
      const idAsesoria = String(btn.dataset.chat || "");
      const cantidad = Number(mapa[idAsesoria] || 0);
      pintarBadge(btn, cantidad);
    });
  }

  async function refresh() {
    if (!token || cargando) return;

    cargando = true;

    try {
      const res = await fetch(`${API}/api/chat/unread/counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!data.ok) return;

      ultimoMapa = data.por_asesoria || {};
      aplicarMapa(ultimoMapa);
    } catch (error) {
      console.warn("No se pudieron cargar mensajes no leídos:", error);
    } finally {
      cargando = false;
    }
  }

  function refreshConDelay() {
    setTimeout(refresh, 120);
  }

  window.EduQuakUnreadChat = {
    refresh,
    apply: () => aplicarMapa(ultimoMapa)
  };

  document.addEventListener("DOMContentLoaded", refreshConDelay);
  document.addEventListener("eduquak:chat-read", refreshConDelay);
  document.addEventListener("eduquak:chat-rendered", () => aplicarMapa(ultimoMapa));

  setInterval(refresh, 15000);
})();
