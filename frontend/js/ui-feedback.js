
(function () {
  function hasSwal() {
    return typeof window.Swal !== "undefined";
  }

  function fallbackAlert(message) {
    if (typeof console !== "undefined") {
      console.log("ALERT:", message);
    }
  }

  const EduQuakUI = {
    toast(icon, title, timer = 2600) {
      if (!hasSwal()) {
        fallbackAlert(title);
        return Promise.resolve();
      }

      const Toast = window.Swal.mixin({
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        timer,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", window.Swal.stopTimer);
          toast.addEventListener("mouseleave", window.Swal.resumeTimer);
        }
      });

      return Toast.fire({ icon, title });
    },

    success(title, text = "") {
      if (!hasSwal()) {
        fallbackAlert(title || text);
        return Promise.resolve();
      }

      if (!text) {
        return this.toast("success", title);
      }

      return window.Swal.fire({
        icon: "success",
        title,
        text,
        confirmButtonText: "Entendido"
      });
    },

    error(title, text = "") {
      if (!hasSwal()) {
        fallbackAlert(title || text);
        return Promise.resolve();
      }

      return window.Swal.fire({
        icon: "error",
        title,
        text,
        confirmButtonText: "Entendido"
      });
    },

    warning(title, text = "") {
      if (!hasSwal()) {
        fallbackAlert(title || text);
        return Promise.resolve();
      }

      return window.Swal.fire({
        icon: "warning",
        title,
        text,
        confirmButtonText: "Entendido"
      });
    },

    info(title, text = "") {
      if (!hasSwal()) {
        fallbackAlert(title || text);
        return Promise.resolve();
      }

      return window.Swal.fire({
        icon: "info",
        title,
        text,
        confirmButtonText: "Entendido"
      });
    },

    confirm({ title, text = "", confirmText = "Sí", cancelText = "Cancelar", icon = "question", reverseButtons = true, confirmButtonColor = undefined, cancelButtonColor = undefined }) {
      if (!hasSwal()) {
        return Promise.resolve(window.confirm(text || title));
      }

      return window.Swal.fire({
        icon,
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons,
        focusCancel: true,
        confirmButtonColor,
        cancelButtonColor
      }).then((result) => result.isConfirmed);
    }
  };

  window.EduQuakUI = EduQuakUI;

  window.eduquakToast = (icon, title, timer) => EduQuakUI.toast(icon, title, timer);
  window.eduquakSuccess = (title, text) => EduQuakUI.success(title, text);
  window.eduquakError = (title, text) => EduQuakUI.error(title, text);
  window.eduquakWarning = (title, text) => EduQuakUI.warning(title, text);
  window.eduquakConfirm = (options) => EduQuakUI.confirm(options);

  const nativeAlert = window.alert.bind(window);
  window.alert = function (message) {
    if (!hasSwal()) {
      nativeAlert(message);
      return;
    }

    return window.Swal.fire({
      icon: "info",
      title: "Aviso",
      text: String(message || ""),
      confirmButtonText: "Entendido"
    });
  };
})();
