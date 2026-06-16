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

const PASSWORD_RULES_MESSAGE =
  "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y al menos un número.";

function validarPasswordSegura(password) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password || "");
}


const TELEFONO_RULES_MESSAGE = "El teléfono solo debe contener números.";

function normalizarTelefonoInput(input) {
  if (!input) return "";
  const soloNumeros = String(input.value || "").replace(/\D/g, "");
  if (input.value !== soloNumeros) {
    input.value = soloNumeros;
  }
  return soloNumeros;
}

function prepararValidacionTelefono() {
  const telefonoInput = document.getElementById("telefono");
  if (!telefonoInput) return;

  telefonoInput.setAttribute("inputmode", "numeric");
  telefonoInput.setAttribute("pattern", "[0-9]*");
  telefonoInput.setAttribute("maxlength", "15");

  telefonoInput.addEventListener("input", () => {
    normalizarTelefonoInput(telefonoInput);
  });

  telefonoInput.addEventListener("paste", () => {
    setTimeout(() => normalizarTelefonoInput(telefonoInput), 0);
  });
}

prepararValidacionTelefono();

function mostrarErrorRegistro(titulo, mensaje) {
  const mensajeBox = document.getElementById("mensajeRegistro");

  if (mensajeBox) {
    mensajeBox.textContent = mensaje;
  }

  if (window.EduQuakUI) {
    window.EduQuakUI.error(titulo, mensaje);
  }
}

document.getElementById("formAsesor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const mensajeBox = document.getElementById("mensajeRegistro");
  const aceptaTerminos = document.getElementById("terminos_aceptados");
  const passwordInput = document.getElementById("password");
  const password = passwordInput ? passwordInput.value : "";
  const telefonoInput = document.getElementById("telefono");
  const telefono = normalizarTelefonoInput(telefonoInput);

  if (telefono && !/^\d+$/.test(telefono)) {
    if (telefonoInput) {
      telefonoInput.focus();
    }

    mostrarErrorRegistro(
      "Teléfono inválido",
      TELEFONO_RULES_MESSAGE
    );

    return;
  }

  if (!validarPasswordSegura(password)) {
    if (passwordInput) {
      passwordInput.focus();
    }

    mostrarErrorRegistro(
      "Contraseña no segura",
      PASSWORD_RULES_MESSAGE
    );

    return;
  }

  if (!aceptaTerminos || !aceptaTerminos.checked) {
    mensajeBox.textContent = "Debes aceptar los Términos y Condiciones.";

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Falta aceptar términos",
        "Para crear tu cuenta debes aceptar los Términos y Condiciones."
      );
    }

    return;
  }

  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API}/api/auth/register/asesor`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Registro asesor:", data);

    if (!data.ok) {
      mensajeBox.textContent = data.message || "Error al registrar asesor";

      if (window.EduQuakUI) {
        window.EduQuakUI.error(
          "No se pudo registrar",
          data.message || "Error al registrar asesor"
        );
      }

      return;
    }

    mensajeBox.textContent = "";

    if (window.EduQuakUI) {
      await window.EduQuakUI.success(
        "Asesor registrado correctamente",
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
    console.error("Error en registro de asesor:", error);
    mensajeBox.textContent = "Error de conexión con el servidor.";

    if (window.EduQuakUI) {
      window.EduQuakUI.error(
        "Error de conexión",
        "No se pudo conectar con el servidor."
      );
    }
  }
});
