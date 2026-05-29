
(function () {
  if (window.EduQuakLoading) {
    return;
  }

  const state = {
    pending: 0,
    showTimer: null,
    hideTimer: null,
    overlay: null
  };

  function ensureOverlay() {
    if (state.overlay) {
      return state.overlay;
    }

    const overlay = document.createElement("div");
    overlay.id = "eduquakLoadingOverlay";
    overlay.className = "eduquak-loading-overlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="eduquak-loading-box" role="status" aria-live="polite">
        <div class="eduquak-spinner"></div>
        <p class="eduquak-loading-text">Cargando...</p>
      </div>
    `;

    document.body.appendChild(overlay);
    state.overlay = overlay;

    return overlay;
  }

  function show() {
    clearTimeout(state.hideTimer);

    state.showTimer = setTimeout(() => {
      const overlay = ensureOverlay();

      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("eduquak-loading-active");
    }, 160);
  }

  function hide(force = false) {
    clearTimeout(state.showTimer);
    clearTimeout(state.hideTimer);

    state.hideTimer = setTimeout(() => {
      if (!force && state.pending > 0) {
        return;
      }

      const overlay = ensureOverlay();

      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("eduquak-loading-active");
    }, 160);
  }

  function start() {
    state.pending += 1;
    show();
  }

  function stop() {
    state.pending = Math.max(0, state.pending - 1);

    if (state.pending === 0) {
      hide();
    }
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (...args) {
    const url = String(args[0]?.url || args[0] || "");

    const ignoreLoading =
      url.includes("/api/chat/") ||
      url.includes("sweetalert2");

    if (!ignoreLoading) {
      start();
    }

    try {
      return await originalFetch(...args);
    } finally {
      if (!ignoreLoading) {
        stop();
      }
    }
  };

  window.EduQuakLoading = {
    show: start,
    hide: stop,
    forceHide: () => {
      state.pending = 0;
      hide(true);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureOverlay();

    setTimeout(() => {
      if (state.pending === 0) {
        hide(true);
      }
    }, 600);
  });
})();
