// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de cargar perfil asesor en esta pantalla y mantiene conectada la vista con el backend.
async function cargarPerfilAsesor() {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("Perfil asesor:", data);

    if (!data.ok) {
      document.getElementById("mensajePerfilAsesor").textContent =
        data.message || "No se pudo cargar el perfil.";
      return;
    }

    const user = data.user;

    document.getElementById("nombre").value = user.nombre || "";
    document.getElementById("correo").value = user.correo || "";
    document.getElementById("institucion").value = user.institucion || "";
    document.getElementById("telefono").value = user.telefono || "";
    document.getElementById("especialidad").value = user.especialidad || "";
    document.getElementById("materias").value = user.materias || "";
    document.getElementById("descripcion").value = user.descripcion || "";
    document.getElementById("modalidad").value = user.modalidad || "virtual";
    document.getElementById("rol").value = user.rol || "";
    document.getElementById("badge").value = user.badge_verificacion || "";
    document.getElementById("estadoActual").textContent = user.estado_validacion || "-";

    const alertaRechazo = document.getElementById("alertaRechazo");
    const motivoRechazo = document.getElementById("motivoRechazo");
    const formDocumento = document.getElementById("formDocumentoAsesor");
    const alertaReenvio = document.getElementById("alertaReenvio");
    const tipoDocumento = document.getElementById("tipo_documento_respaldo_reenvio");

    if (tipoDocumento) tipoDocumento.value = user.tipo_documento || "documento_respaldo";

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
    console.error("Error al cargar perfil asesor:", error);
    document.getElementById("mensajePerfilAsesor").textContent =
      "Error al cargar el perfil.";
  }
}

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formPerfilAsesor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    institucion: document.getElementById("institucion").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    especialidad: document.getElementById("especialidad").value.trim(),
    materias: document.getElementById("materias").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
    modalidad: document.getElementById("modalidad").value
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
    console.log("Actualizar perfil asesor:", data);

    const box = document.getElementById("mensajePerfilAsesor");
    box.textContent = data.message || "Respuesta recibida.";

    if (data.ok) {
      await cargarPerfilAsesor();
    }
  } catch (error) {
    console.error("Error al actualizar perfil asesor:", error);
    document.getElementById("mensajePerfilAsesor").textContent =
      "Error al actualizar el perfil.";
  }
});

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formPasswordAsesor").addEventListener("submit", async (e) => {
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
    console.log("Actualizar password asesor:", data);

    const box = document.getElementById("mensajePasswordAsesor");
    box.textContent = data.message || "Respuesta recibida.";

    if (data.ok) {
      document.getElementById("formPasswordAsesor").reset();
    }
  } catch (error) {
    console.error("Error al cambiar contraseña asesor:", error);
    document.getElementById("mensajePasswordAsesor").textContent =
      "Error al actualizar la contraseña.";
  }
});

cargarPerfilAsesor();

// Este listener responde al evento "submit" y mantiene la pantalla sincronizada con lo que hace el usuario.
document.getElementById("formDocumentoAsesor")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = document.getElementById("formDocumentoAsesor");
  const box = document.getElementById("mensajeDocumentoAsesor");
  const formData = new FormData(form);

  try {
    const res = await fetch(`${API}/api/users/me/documento/asesor`, {
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
      await cargarPerfilAsesor();
    }
  } catch (error) {
    console.error("Error al reenviar documento del asesor:", error);
    box.textContent = "Error al reenviar el documento.";
  }
});
