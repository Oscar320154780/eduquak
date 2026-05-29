// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const API = window.EDUQUAK_API_URL || "";
const token = localStorage.getItem("token");

let chartAsesoriasEstado = null;
let chartContenidoAsesor = null;

if (!token) {
  window.location.href = "/pages/login.html";
}

// Se encarga de guardar texto en esta pantalla y mantiene conectada la vista con el backend.
function compararRankingAsesores(a, b) {
  const promedioB = Number(b.promedio ?? b.promedio_calificacion ?? 0);
  const promedioA = Number(a.promedio ?? a.promedio_calificacion ?? 0);

  if (promedioB !== promedioA) {
    return promedioB - promedioA;
  }

  const totalB = Number(
    b.total ??
    b.total_calificaciones ??
    b.total_resenas ??
    b.total_reseñas ??
    0
  );

  const totalA = Number(
    a.total ??
    a.total_calificaciones ??
    a.total_resenas ??
    a.total_reseñas ??
    0
  );

  if (totalB !== totalA) {
    return totalB - totalA;
  }

  return String(a.nombre || "").localeCompare(String(b.nombre || ""));
}

function setTexto(id, valor) {
  document.getElementById(id).textContent = valor;
}

// Se encarga de destruir charts en esta pantalla y mantiene conectada la vista con el backend.
function destruirCharts() {
  if (chartAsesoriasEstado) {
    chartAsesoriasEstado.destroy();
    chartAsesoriasEstado = null;
  }

  if (chartContenidoAsesor) {
    chartContenidoAsesor.destroy();
    chartContenidoAsesor = null;
  }
}

// Se encarga de mostrar charts en esta pantalla y mantiene conectada la vista con el backend.
function renderCharts(stats) {
  destruirCharts();

  const asesorias = stats.asesorias || {};
  const materiales = Number(stats.materiales || 0);
  const cuestionarios = Number(stats.cuestionarios || 0);

  const ctxEstado = document.getElementById("chartAsesoriasEstado");
  const ctxContenido = document.getElementById("chartContenidoAsesor");

  chartAsesoriasEstado = new Chart(ctxEstado, {
    type: "bar",
    data: {
      labels: ["Pendientes", "Aceptadas", "Rechazadas", "Finalizadas"],
      datasets: [{
        label: "Asesorías",
        data: [
          Number(asesorias.pendientes || 0),
          Number(asesorias.aceptadas || 0),
          Number(asesorias.rechazadas || 0),
          Number(asesorias.finalizadas || 0)
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  chartContenidoAsesor = new Chart(ctxContenido, {
    type: "doughnut",
    data: {
      labels: ["Materiales", "Cuestionarios"],
      datasets: [{
        label: "Contenido",
        data: [materiales, cuestionarios]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}





async function cargarRankingPersonal(stats) {
  const lugarEl = document.getElementById("rankingLugar");
  const detalleEl = document.getElementById("rankingDetalle");
  const descEl = document.getElementById("rankingDescripcion");

  if (!lugarEl || !detalleEl || !descEl) return;

  try {
    const [meRes, asesoresRes] = await Promise.all([
      fetch(`${API}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      fetch(`${API}/api/users/asesores`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ]);

    const meData = await meRes.json();
    const asesoresData = await asesoresRes.json();

    if (!meData.ok || !asesoresData.ok) {
      throw new Error("No se pudo calcular ranking");
    }

    const idActual = Number(meData.user.id_usuario);
    const asesores = (asesoresData.asesores || [])
      .map((asesor) => ({
        ...asesor,
        id_usuario: Number(asesor.id_usuario),
        promedio: Number(asesor.promedio_calificacion || 0),
        total: Number(asesor.total_calificaciones || 0)
      }))
      .sort(compararRankingAsesores);

    const posicion = asesores.findIndex((asesor) => asesor.id_usuario === idActual) + 1;
    const totalAsesores = asesores.length;
    const promedio = Number(stats.promedio_calificacion || 0);
    const totalResenas = Number(stats.total_calificaciones || 0);

    if (!posicion) {
      lugarEl.textContent = "Sin ranking";
      detalleEl.textContent = "Aún no apareces en el ranking.";
      descEl.textContent = "Cuando tengas más actividad y reseñas, se mostrará tu posición.";
      return;
    }

    lugarEl.textContent = `#${posicion}`;
    detalleEl.textContent = `de ${totalAsesores} asesores verificados`;
    descEl.textContent = `Tu promedio actual es ${promedio.toFixed(2)} / 5 con ${totalResenas} reseña${totalResenas === 1 ? "" : "s"} registrada${totalResenas === 1 ? "" : "s"}.`;
  } catch (error) {
    console.warn("No se pudo cargar ranking personal:", error);
    lugarEl.textContent = "-";
    detalleEl.textContent = "No se pudo calcular tu posición.";
    descEl.textContent = "Tus estadísticas principales siguen disponibles arriba.";
  }
}


// Se encarga de cargar stats asesor en esta pantalla y mantiene conectada la vista con el backend.
async function cargarStatsAsesor() {
  try {
    const res = await fetch(`${API}/api/stats/asesor`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let data;

    try {
      data = await res.json();
    } catch (jsonError) {
      console.error("La respuesta no fue JSON:", jsonError);
      return;
    }

    console.log("Stats asesor:", data);

    if (!data.ok) {
      return;
    }

    const stats = data.stats || {};
    const asesorias = stats.asesorias || {};

    setTexto("statTotalAsesorias", Number(asesorias.total || 0));
    setTexto("statPendientes", Number(asesorias.pendientes || 0));
    setTexto("statAceptadas", Number(asesorias.aceptadas || 0));
    setTexto("statFinalizadas", Number(asesorias.finalizadas || 0));
    setTexto("statMateriales", Number(stats.materiales || 0));
    setTexto("statCuestionarios", Number(stats.cuestionarios || 0));
    setTexto("statPromedio", `${Number(stats.promedio_calificacion || 0).toFixed(2)} / 5`);
    setTexto("statResenas", Number(stats.total_calificaciones || 0));

    renderCharts(stats);
    await cargarRankingPersonal(stats);
  } catch (error) {
    console.error("Error al cargar estadísticas del asesor:", error);
  }
}

cargarStatsAsesor();