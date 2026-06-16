const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

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
    document.getElementById("precio_individual").value = user.precio_individual || 100;
    actualizarEstadoMercadoPago(user);
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

    let alertaSancion = document.getElementById("alertaSancion");
    if (!alertaSancion) {
      alertaSancion = document.createElement("div");
      alertaSancion.id = "alertaSancion";
      alertaSancion.className = "status-alert hidden";
      alertaRechazo?.parentNode?.insertBefore(alertaSancion, alertaRechazo);
    }

    alertaSancion.classList.add("hidden");

    if (user.sancion_activa && user.sancion) {
      const fecha = new Date(user.sancion.fecha_fin);
      const fechaTexto = Number.isNaN(fecha.getTime())
        ? user.sancion.fecha_fin
        : fecha.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });

      alertaSancion.innerHTML = `
        <strong>Cuenta sancionada temporalmente</strong>
        <p>Motivo: ${user.sancion.motivo || "Incumplimiento de normas"}</p>
        <p>Bloqueada hasta: ${fechaTexto}</p>
      `;
      alertaSancion.classList.remove("hidden");
    }

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

document.getElementById("formPerfilAsesor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    institucion: document.getElementById("institucion").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    especialidad: document.getElementById("especialidad").value.trim(),
    materias: document.getElementById("materias").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
    modalidad: document.getElementById("modalidad").value,
    precio_individual: Number(document.getElementById("precio_individual").value || 100)
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

function actualizarEstadoMercadoPago(user) {
  const estado = document.getElementById("estadoMercadoPago");
  const detalle = document.getElementById("detalleMercadoPago");
  const btnConectar = document.getElementById("btnConectarMP");
  const btnDesconectar = document.getElementById("btnDesconectarMP");

  if (!estado) return;

  if (user.mp_conectado) {
    estado.value = user.mp_user_id ? `Cuenta conectada (${user.mp_user_id})` : "Cuenta conectada";
    if (detalle) detalle.textContent = "Los pagos de tus asesorías se crearán con tu cuenta de vendedor y EduQuak aplicará su comisión.";
    btnConectar?.classList.add("hidden");
    btnDesconectar?.classList.remove("hidden");
  } else {
    estado.value = "Pendiente de conexión";
    if (detalle) detalle.textContent = "Conecta tu cuenta para recibir pagos de alumnos y permitir la comisión de EduQuak.";
    btnConectar?.classList.remove("hidden");
    btnDesconectar?.classList.add("hidden");
  }
}

async function conectarMercadoPago() {
  const box = document.getElementById("mensajePerfilAsesor");

  try {
    if (box) box.textContent = "Generando conexión con Mercado Pago...";

    const res = await fetch(`${API}/api/mercadopago/conectar-url`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      if (box) box.textContent = data.message || "No se pudo conectar Mercado Pago.";
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Error al conectar Mercado Pago:", error);
    if (box) box.textContent = "Error al iniciar la conexión con Mercado Pago.";
  }
}

async function desconectarMercadoPago() {
  const confirmar = confirm("¿Quieres desconectar tu cuenta de Mercado Pago?");
  const box = document.getElementById("mensajePerfilAsesor");

  if (!confirmar) return;

  try {
    const res = await fetch(`${API}/api/mercadopago/desconectar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (box) box.textContent = data.message || "Respuesta recibida.";
    await cargarPerfilAsesor();
  } catch (error) {
    console.error("Error al desconectar Mercado Pago:", error);
    if (box) box.textContent = "Error al desconectar Mercado Pago.";
  }
}

function revisarRetornoMercadoPago() {
  const params = new URLSearchParams(window.location.search);
  const estado = params.get("mp");
  const detalle = params.get("detalle");
  const box = document.getElementById("mensajePerfilAsesor");

  if (!estado || !box) return;

  if (estado === "connected") {
    box.textContent = "Mercado Pago conectado correctamente.";
  } else if (estado === "error") {
    box.textContent = detalle || "No se pudo conectar Mercado Pago.";
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

cargarPerfilAsesor();
revisarRetornoMercadoPago();

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


document.getElementById("btnConectarMP")?.addEventListener("click", conectarMercadoPago);
document.getElementById("btnDesconectarMP")?.addEventListener("click", desconectarMercadoPago);
