// Mostrar/ocultar contraseña
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

// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formAlumno").addEventListener("submit", async (e) => {
  e.preventDefault();

  const mensajeBox = document.getElementById("mensajeRegistro");
  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API}/api/auth/register/alumno`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Registro alumno:", data);

    if (!data.ok) {
      mensajeBox.textContent = data.message || "Error al registrar alumno";

      if (window.EduQuakUI) {
        window.EduQuakUI.error(
          "No se pudo registrar",
          data.message || "Error al registrar alumno"
        );
      }

      return;
    }

    mensajeBox.textContent = "";

    if (window.EduQuakUI) {
      await window.EduQuakUI.success(
        "Alumno registrado correctamente",
        "Tu cuenta quedó en revisión. Ahora puedes iniciar sesión."
      );
      window.location.href = "/pages/login.html";
      return;
    }

    mensajeBox.textContent = "Registro exitoso. Ahora inicia sesión.";

    setTimeout(() => {
      window.location.href = "/pages/login.html";
    }, 1500);

  } catch (error) {
    console.error("Error en registro:", error);
    mensajeBox.textContent = "Error de conexión con el servidor.";

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Error de conexión",
        "No se pudo conectar con el servidor."
      );
    }
  }
});