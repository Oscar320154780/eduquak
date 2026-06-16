document
  .querySelectorAll("[data-password-toggle]")
  .forEach((btn) => {
    btn.addEventListener("click", () => {
      const inputId = btn.dataset.passwordToggle;
      const input = document.getElementById(inputId);

      if (!input) return;

      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.innerHTML = visible
        ? `<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                <circle cx="12" cy="12" r="2.7"></circle>
              </svg>`
        : `<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6c2.1 0 3.9.7 5.4 1.6M21.5 12s-3.5 6-9.5 6c-2.1 0-3.9-.7-5.4-1.6"></path>
                <path d="M4 4l16 16"></path>
              </svg>`;

      btn.setAttribute(
        "aria-label",
        visible ? "Mostrar contraseña" : "Ocultar contraseña"
      );
    });
  });

const API = window.EDUQUAK_API_URL || "";

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const mensajeBox = document.getElementById("mensajeLogin");

  const body = {
    correo: form.correo.value,
    password: form.password.value
  };

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("Login:", data);

    if (!data.ok) {
      const mensaje =
        data.message || "Correo o contraseña incorrectos.";

      mensajeBox.textContent = mensaje;

      if (window.EduQuakUI) {
        window.EduQuakUI.toast(
          "error",
          mensaje.toLowerCase().includes("contraseña") ||
          mensaje.toLowerCase().includes("credenciales")
            ? "Contraseña o correo incorrectos"
            : mensaje,
          3200
        );
      }

      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    mensajeBox.textContent = "Inicio de sesión exitoso.";

    if (data.user.rol === "alumno") {
      window.location.href = "/pages/alumno.html";
    } else if (data.user.rol === "asesor") {
      window.location.href = "/pages/asesor.html";
    } else if (data.user.rol === "admin") {
      window.location.href = "/pages/admin.html";
    } else {
      mensajeBox.textContent = "Rol no reconocido.";
    }
  } catch (error) {
    console.error("Error en login:", error);
    mensajeBox.textContent = "Error de conexión con el servidor.";

    if (window.EduQuakUI) {
      window.EduQuakUI.toast(
        "error",
        "No se pudo conectar con el servidor",
        3200
      );
    }
  }
});
