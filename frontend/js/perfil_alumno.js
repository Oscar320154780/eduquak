// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de cargar perfil en esta pantalla y mantiene conectada la vista con el backend.
async function cargarPerfil() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Perfil alumno:", data);

    if (!data.ok) {
      document.getElementById("mensajePerfil").textContent =
        data.message || "No se pudo cargar el perfil.";
      return;
    }

    const user = data.user;

    document.getElementById("nombre").value = user.nombre || "";
    document.getElementById("correo").value = user.correo || "";
    document.getElementById("institucion").value = user.institucion || "";
    document.getElementById("telefono").value = user.telefono || "";
    document.getElementById("rol").value = user.rol || "";
    document.getElementById("badge").value = user.badge_verificacion || "";
    document.getElementById("estadoActual").textContent = user.estado_validacion || "-";

    const alertaRechazo = document.getElementById("alertaRechazo");
    const motivoRechazo = document.getElementById("motivoRechazo");
    const formDocumento = document.getElementById("formDocumentoAlumno");
    const alertaReenvio = document.getElementById("alertaReenvio");
    const tipoDocumento = document.getElementById("tipo_documento_reenvio");

    if (tipoDocumento) tipoDocumento.value = user.tipo_documento || "constancia_estudios";

    alertaRechazo?.classList.add("hidden");
    formDocumento?.classList.add("hidden");
    alertaReenvio?.classList.add("hidden");

    if (user.estado_validacion === "rechazado") {
      if (motivoRechazo) motivoRechazo.textContent = user.motivo_rechazo || "El administrador no agregó un motivo.";
      alertaRechazo?.classList.remove("hidden");
      formDocumento?.classList.remove("hidden");
    } else if (user.estado_validacion === "pendiente" && Number(user.documento_reenviado || 0) === 1) {
      alertaReenvio?.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error al cargar perfil:", error);
    document.getElementById("mensajePerfil").textContent =
      "Error al cargar el perfil.";
  }
}

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formPerfil").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    institucion: document.getElementById("institucion").value.trim(),
    telefono: document.getElementById("telefono").value.trim()
  };

  try {
    const res = await fetch(`${API}/api/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Actualizar perfil alumno:", data);

    const box = document.getElementById("mensajePerfil");
    box.textContent = data.message || "Respuesta recibida.";

    if (data.ok) {
      await cargarPerfil();
    }
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    document.getElementById("mensajePerfil").textContent =
      "Error al actualizar el perfil.";
  }
});

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formPassword").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    password_actual: document.getElementById("password_actual").value,
    password_nueva: document.getElementById("password_nueva").value,
    password_confirmacion: document.getElementById("password_confirmacion").value
  };

  try {
    const res = await fetch(`${API}/api/users/me/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Actualizar password alumno:", data);

    const box = document.getElementById("mensajePassword");
    box.textContent = data.message || "Respuesta recibida.";

    if (data.ok) {
      document.getElementById("formPassword").reset();
    }
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    document.getElementById("mensajePassword").textContent =
      "Error al actualizar la contraseña.";
  }
});

cargarPerfil();

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formDocumentoAlumno")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = document.getElementById("formDocumentoAlumno");
  const box = document.getElementById("mensajeDocumentoAlumno");
  const formData = new FormData(form);

  try {
    const res = await fetch(`${API}/api/users/me/documento/alumno`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    box.textContent = data.message || "Respuesta recibida.";

    if (data.ok) {
      form.reset();
      await cargarPerfil();
    }
  } catch (error) {
    console.error("Error al reenviar documento del alumno:", error);
    box.textContent = "Error al reenviar el documento.";
  }
});
