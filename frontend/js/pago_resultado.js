const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);

const card = document.getElementById("estadoPagoCard");
const titulo = document.getElementById("tituloPago");
const mensaje = document.getElementById("mensajePago");
const detalle = document.getElementById("detallePago");

function pintarEstado(clase, tituloTexto, mensajeTexto) {
  card.className = `pago-resultado-card ${clase}`;
  titulo.textContent = tituloTexto;
  mensaje.textContent = mensajeTexto;
}

function obtenerParametro(nombre) {
  return params.get(nombre) || "";
}

async function registrarRetorno() {
  if (!token) {
    pintarEstado("rechazado", "Sesión no encontrada", "Inicia sesión para registrar el resultado de tu pago.");
    detalle.textContent = "El pago puede haberse realizado, pero EduQuak necesita que vuelvas a iniciar sesión para actualizarlo.";
    return;
  }

  const payload = {
    id_pago: obtenerParametro("id_pago"),
    payment_id: obtenerParametro("payment_id"),
    collection_id: obtenerParametro("collection_id"),
    status: obtenerParametro("status") || obtenerParametro("resultado"),
    collection_status: obtenerParametro("collection_status"),
    preference_id: obtenerParametro("preference_id"),
    merchant_order_id: obtenerParametro("merchant_order_id")
  };

  detalle.textContent = "Registrando resultado del pago...";

  try {
    const res = await fetch(`${API}/api/pagos/registrar-retorno`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.message || data.detalle || "No se pudo registrar el pago");
    }

    if (data.estado === "aprobado") {
      pintarEstado("aprobado", "Pago aprobado", "Tu asesoría quedó pagada y el acceso fue liberado.");
      detalle.textContent = data.message || "Pago registrado correctamente.";
      setTimeout(() => {
        window.location.href = "/pages/mis_asesorias.html?payment=success";
      }, 2200);
      return;
    }

    if (data.estado === "pending" || data.estado === "pendiente") {
      pintarEstado("pendiente", "Pago pendiente", "Mercado Pago todavía está procesando la operación.");
      detalle.textContent = data.message || "El estado se actualizará automáticamente cuando Mercado Pago confirme el pago.";
      return;
    }

    pintarEstado("rechazado", "Pago no aprobado", "El pago no fue aprobado o fue cancelado.");
    detalle.textContent = data.message || "No se liberó el acceso a la asesoría.";
  } catch (error) {
    pintarEstado("pendiente", "Pago en revisión", "No pudimos confirmar automáticamente el pago.");
    detalle.textContent = error.message || "Error al confirmar pago. En Render se confirmará por webhook si Mercado Pago ya aprobó la operación.";
  }
}

registrarRetorno();
