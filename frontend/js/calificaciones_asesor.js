const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

function generarEstrellas(calificacion) {
  const valor = Number(calificacion) || 0;
  const llenas = Math.round(valor);
  const vacias = 5 - llenas;
  return "★".repeat(llenas) + "☆".repeat(vacias);
}


function formatearFechaCorta(valor) {
  if (!valor || String(valor).toLowerCase() === "pendiente") {
    return "Pendiente";
  }

  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function renderResenas(lista) {
  const contenedor = document.getElementById("listaResenas");
  contenedor.innerHTML = "";

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Aún no has recibido reseñas.
      </div>
    `;
    return;
  }

  lista.forEach((resena) => {
    const calificacion = Number(resena.calificacion || 0);

    const card = document.createElement("article");
    card.className = "resena-card";

    card.innerHTML = `
      <div class="card-top">
        <h3>${resena.nombre_alumno || "Alumno"} <span class="role-badge role-alumno inline">Alumno</span></h3>
        <span class="rating-pill">
          ${generarEstrellas(calificacion)} ${calificacion}/5
        </span>
      </div>

      <p class="info-line"><strong>Asesoría:</strong> #${resena.numero_asesoria_asesor || resena.asesoria_numero || "-"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${formatearFechaCorta(resena.fecha_resena)}</p>

      ${
        resena.comentario
          ? `
            <div class="comentario-box">
              ${resena.comentario}
            </div>
          `
          : `
            <div class="comentario-box">
              Sin comentario adicional.
            </div>
          `
      }
    `;

    contenedor.appendChild(card);
  });
}

async function cargarCalificaciones() {
  try {
    const res = await fetch(`${API}/api/resenas/mis`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let data;

try {
  data = await res.json();
} catch (jsonError) {
  console.error("La respuesta no fue JSON:", jsonError);
  document.getElementById("listaResenas").innerHTML = `
    <div class="empty-state">La ruta de reseñas no existe o devolvió un error.</div>
  `;
  return;
}
    console.log("Calificaciones asesor:", data);

    if (!data.ok) {
      document.getElementById("listaResenas").innerHTML = `
        <div class="empty-state">No se pudieron cargar tus reseñas.</div>
      `;
      return;
    }

    const resumen = data.resumen || {};
    document.getElementById("promedioGeneral").textContent =
      `${Number(resumen.promedio || 0).toFixed(2)} / 5`;

    document.getElementById("totalResenas").textContent =
      Number(resumen.total || 0);

    renderResenas(data.resenas || []);
  } catch (error) {
    console.error("Error al cargar calificaciones del asesor:", error);
    document.getElementById("listaResenas").innerHTML = `
      <div class="empty-state">Error al cargar tus reseñas.</div>
    `;
  }
}

cargarCalificaciones();
