// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de ocultar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function ocultarMensaje() {
  const box = document.getElementById("mensajeCalificacion");
  box.textContent = "";
  box.classList.add("hidden");
}


function inicializarTabsCalificacion() {
  const tabPendientes = document.getElementById("tabPendientesCalificar");
  const tabEvaluadas = document.getElementById("tabEvaluadasCalificar");
  const panelPendientes = document.getElementById("panelPendientesCalificar");
  const panelEvaluadas = document.getElementById("panelEvaluadasCalificar");

  if (!tabPendientes || !tabEvaluadas || !panelPendientes || !panelEvaluadas) return;

  tabPendientes.addEventListener("click", () => {
    tabPendientes.classList.add("active");
    tabEvaluadas.classList.remove("active");
    panelPendientes.classList.remove("hidden");
    panelPendientes.classList.add("active");
    panelEvaluadas.classList.add("hidden");
    panelEvaluadas.classList.remove("active");
  });

  tabEvaluadas.addEventListener("click", () => {
    tabEvaluadas.classList.add("active");
    tabPendientes.classList.remove("active");
    panelEvaluadas.classList.remove("hidden");
    panelEvaluadas.classList.add("active");
    panelPendientes.classList.add("hidden");
    panelPendientes.classList.remove("active");
  });
}

function renderEvaluadas(evaluadas) {
  const contenedor = document.getElementById("listaEvaluadas");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!evaluadas || evaluadas.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        Todavía no tienes asesorías evaluadas.
      </div>
    `;
    return;
  }

  evaluadas.forEach((a) => {
    const card = document.createElement("article");
    card.className = "calificacion-card evaluada-card";

    const calificacion = Number(a.calificacion || 0);
    const estrellas = "★".repeat(calificacion) + "☆".repeat(5 - calificacion);
    const comentario = a.comentario
      ? a.comentario
      : "Sin comentario.";

    card.innerHTML = `
      <div class="calificacion-card-head">
        <div>
          <span class="tipo-chip">${a.tipo || "asesoría"}</span>
          <h3>${a.nombre_asesor} <span class="role-badge role-asesor inline">Asesor</span></h3>
          <p>${a.fecha || "-"} · ${a.hora || ""}</p>
        </div>
        <span class="estado-evaluada">Evaluada</span>
      </div>

      <div class="evaluada-score-row">
        <div class="stars-readonly">${estrellas}</div>
        <strong>${calificacion}/5</strong>
      </div>

      <div class="comentario-evaluado ${a.comentario ? "" : "muted"}">
        ${comentario}
      </div>
    `;

    contenedor.appendChild(card);
  });
}


// Se encarga de mostrar mensaje en esta pantalla y mantiene conectada la vista con el backend.
function mostrarMensaje(texto) {
  const box = document.getElementById("mensajeCalificacion");
  box.textContent = texto;
  box.classList.remove("hidden");
}

// Se encarga de abrir modal reporte en esta pantalla y mantiene conectada la vista con el backend.
function abrirModalReporte(idAsesoria) {

  document.getElementById("modalReporte").classList.remove("hidden");

  document.getElementById("idReporteAsesoria").value = idAsesoria;

  document.getElementById("motivoReporte").value = "";
  document.getElementById("descripcionReporte").value = "";

}

// Se encarga de cerrar modal reporte en esta pantalla y mantiene conectada la vista con el backend.
function cerrarModalReporte() {

  document.getElementById("modalReporte").classList.add("hidden");

}

// Se encarga de enviar reporte en esta pantalla y mantiene conectada la vista con el backend.
async function enviarReporte() {

  const idAsesoria =
    document.getElementById("idReporteAsesoria").value;

  const motivo =
    document.getElementById("motivoReporte").value;

  const descripcion =
    document.getElementById("descripcionReporte").value.trim();

  if (!motivo) {

    mostrarMensaje(
      "Debes seleccionar un motivo."
    );

    return;
  }

  try {

    const res = await fetch(
      `${API}/api/asesorias/${idAsesoria}/reportar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          motivo,
          descripcion
        })
      }
    );

    const data = await res.json();

    mostrarMensaje(
      data.message || "Respuesta recibida."
    );

    if (data.ok) {
      cerrarModalReporte();
    }

  } catch (error) {

    console.error(
      "Error al reportar asesoría:",
      error
    );

    mostrarMensaje(
      "Error al enviar reporte."
    );

  }

}

// Se encarga de cargar asesorias finalizadas en esta pantalla y mantiene conectada la vista con el backend.
async function cargarAsesoriasFinalizadas() {

  try {

    const res = await fetch(
      `${API}/api/asesorias/finalizadas`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    console.log(data);

    const contenedor =
      document.getElementById("listaAsesorias");

    contenedor.innerHTML = "";

    if (!data.ok) {

      contenedor.innerHTML = `
        <div class="empty-state">
          Error al cargar asesorías para calificar.
        </div>
      `;

      renderEvaluadas([]);
      ocultarMensaje();
      return;
    }

    const pendientes = data.asesorias || data.pendientes || [];
    const evaluadas = data.evaluadas || [];

    renderEvaluadas(evaluadas);

    if (pendientes.length === 0) {

      contenedor.innerHTML = `
        <div class="empty-state">
          No hay asesorías para calificar.
        </div>
      `;

      ocultarMensaje();
      return;
    }

    pendientes.forEach((a) => {

      const card = document.createElement("div");

      card.className = "card calificacion-card pendiente-card";

      card.innerHTML = `
        <div class="calificacion-card-head">
          <div>
            <span class="tipo-chip">${a.tipo || "asesoría"}</span>
            <h3>${a.nombre_asesor} <span class="role-badge role-asesor inline">Asesor</span></h3>
            <p>${a.fecha || "-"} · ${a.hora || ""}</p>
          </div>
          <span class="estado-pendiente">Pendiente</span>
        </div>

        <div class="rating-box">
          <span class="rating-label">Selecciona una calificación</span>

          <div class="stars" data-id="${a.id_asesoria}">
            ${[1, 2, 3, 4, 5]
              .map(
                (i) =>
                  `<span class="star" data-val="${i}">★</span>`
              )
              .join("")}
          </div>
        </div>

        <textarea placeholder="Comentario opcional para el asesor..."></textarea>

        <div class="acciones-card">

          <button class="btn-enviar">
            Enviar calificación
          </button>

        </div>
      `;

      let calificacion = 0;

      const stars =
        card.querySelectorAll(".star");

      stars.forEach((star) => {

        star.addEventListener("click", () => {

          calificacion =
            Number(star.dataset.val);

          stars.forEach((s) => {

            s.classList.toggle(
              "active",
              Number(s.dataset.val) <= calificacion
            );

          });

        });

      });

      card
        .querySelector(".btn-enviar")
        .addEventListener("click", async () => {

          const comentario =
            card.querySelector("textarea")
              .value
              .trim();

          if (!calificacion) {

            mostrarMensaje(
              "Selecciona una calificación antes de enviar."
            );

            return;
          }

          const res = await fetch(
            `${API}/api/asesorias/${a.id_asesoria}/calificar`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                estrellas: calificacion,
                comentario
              })
            }
          );

          const data = await res.json();

          if (data.ok) {

            mostrarMensaje("");

            if (window.EduQuakUI) {
              window.EduQuakUI.toast(
                "success",
                "Asesor evaluado correctamente"
              );
            } else {
              mostrarMensaje("Asesor evaluado correctamente.");
            }

            await cargarAsesoriasFinalizadas();

          } else {

            if (window.EduQuakUI) {
              window.EduQuakUI.error(
                "No se pudo enviar",
                data.message || "No se pudo registrar la calificación."
              );
            } else {
              mostrarMensaje(data.message || "No se pudo registrar la calificación.");
            }

          }

        });

      contenedor.appendChild(card);

    });

  } catch (error) {

    console.error(
      "Error al cargar asesorías finalizadas:",
      error
    );

    document.getElementById(
      "listaAsesorias"
    ).innerHTML = `
      <div class="empty-state">
        Error al cargar asesorías para calificar.
      </div>
    `;

    renderEvaluadas([]);
    ocultarMensaje();

  }

}

ocultarMensaje();
inicializarTabsCalificacion();
cargarAsesoriasFinalizadas();