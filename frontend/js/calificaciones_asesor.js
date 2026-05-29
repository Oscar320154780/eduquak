// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de generar estrellas en esta pantalla y mantiene conectada la vista con el backend.
function generarEstrellas(calificacion) {
  const valor = Number(calificacion) || 0;
  const llenas = Math.round(valor);
  const vacias = 5 - llenas;
  return "★".repeat(llenas) + "☆".repeat(vacias);
}

// Se encarga de mostrar resenas en esta pantalla y mantiene conectada la vista con el backend.
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
        <h3>${resena.nombre_alumno || "Alumno"}</h3>
        <span class="rating-pill">
          ${generarEstrellas(calificacion)} ${calificacion}/5
        </span>
      </div>

      <p class="info-line"><strong>Asesoría:</strong> #${resena.id_asesoria || "-"}</p>
      <p class="info-line"><strong>Fecha:</strong> ${resena.fecha_resena || "-"}</p>

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

// Se encarga de cargar calificaciones en esta pantalla y mantiene conectada la vista con el backend.
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