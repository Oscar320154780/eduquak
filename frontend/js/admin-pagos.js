const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

function dinero(valor) {
  const monto = Number(valor || 0);
  return monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fecha(valor) {
  if (!valor) return "-";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function estadoClase(valor) {
  const estado = String(valor || "pendiente").toLowerCase();
  if (estado === "aprobado") return "aprobado";
  if (estado === "rechazado" || estado === "fallido") return "rechazado";
  return "pendiente";
}

function pintarResumen(resumen = {}) {
  document.getElementById("statTotalPagos").textContent = resumen.total_pagos || 0;
  document.getElementById("statVentas").textContent = dinero(resumen.ventas_aprobadas);
  document.getElementById("statComision").textContent = dinero(resumen.comision_eduquak);
  document.getElementById("statAsesores").textContent = dinero(resumen.ganancia_asesores);
}

function pintarPagos(pagos = []) {
  const contenedor = document.getElementById("listaPagosAdmin");

  if (!pagos.length) {
    contenedor.innerHTML = `<div class="empty-state">Aún no hay pagos registrados.</div>`;
    return;
  }

  contenedor.innerHTML = pagos.map((pago) => `
    <article class="pago-admin-card">
      <div class="pago-admin-top">
        <div>
          <h3>${pago.tipo || "asesoría"} #${pago.id_asesoria || "-"}</h3>
          <p>${pago.nombre_alumno || "Alumno"} → ${pago.nombre_asesor || "Asesor"}</p>
        </div>
        <span class="pago-estado ${estadoClase(pago.estado)}">${pago.estado || "pendiente"}</span>
      </div>
      <div class="pago-admin-grid">
        <span><b>Total</b>${dinero(pago.monto_total)}</span>
        <span><b>EduQuak</b>${dinero(pago.comision_eduquak)}</span>
        <span><b>Asesor</b>${dinero(pago.monto_asesor)}</span>
        <span><b>Fecha</b>${fecha(pago.fecha_creacion)}</span>
      </div>
      <p class="pago-admin-ref">Preference: ${pago.preference_id || "-"} · Payment: ${pago.payment_id || "-"}</p>
    </article>
  `).join("");
}

async function cargarPagos() {
  try {
    const res = await fetch(`${API}/api/pagos/admin/resumen`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.message || "No se pudo cargar el resumen");
    }

    pintarResumen(data.resumen || {});
    pintarPagos(data.pagos || []);
  } catch (error) {
    document.getElementById("listaPagosAdmin").innerHTML = `<div class="empty-state">${error.message || "Error al cargar pagos."}</div>`;
  }
}

cargarPagos();
