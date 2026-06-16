const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}



function normalizarPaginacion(req, limiteDefault = 20, limiteMaximo = 100) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitSolicitado = parseInt(req.query.limit, 10) || limiteDefault;
  const limit = Math.min(Math.max(limitSolicitado, 1), limiteMaximo);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

exports.crearCuestionario = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;
    const { titulo, descripcion, materia } = req.body;

    if (!titulo || !materia) {
      return res.status(400).json({
        ok: false,
        message: "Título y materia son obligatorios"
      });
    }

    const result = await runQuery(
      `INSERT INTO cuestionarios (
        id_asesor,
        titulo,
        descripcion,
        materia,
        estado_revision
      ) VALUES (?, ?, ?, ?, 'pendiente_revision')`,
      [id_asesor, titulo, descripcion || null, materia]
    );

    return res.status(201).json({
      ok: true,
      message: "Cuestionario creado correctamente. Está en revisión.",
      cuestionario: {
        id_cuestionario: result.lastID,
        titulo,
        descripcion,
        materia,
        estado_revision: "pendiente_revision"
      }
    });
  } catch (error) {
    console.error("Error al crear cuestionario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al crear cuestionario"
    });
  }
};



function normalizarPaginacion(req, limiteDefault = 20, limiteMaximo = 100) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitSolicitado = parseInt(req.query.limit, 10) || limiteDefault;
  const limit = Math.min(Math.max(limitSolicitado, 1), limiteMaximo);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

exports.crearCuestionarioCompleto = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;
    const { titulo, descripcion, materia, preguntas } = req.body;

    if (!titulo || !materia) {
      return res.status(400).json({
        ok: false,
        message: "Título y materia son obligatorios"
      });
    }

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar al menos una pregunta"
      });
    }

    for (const p of preguntas) {
      if (
        !p.pregunta ||
        !p.opcion_a ||
        !p.opcion_b ||
        !p.opcion_c ||
        !p.opcion_d ||
        !p.respuesta_correcta
      ) {
        return res.status(400).json({
          ok: false,
          message: "Todas las preguntas deben estar completas"
        });
      }

      if (!["A", "B", "C", "D"].includes(p.respuesta_correcta)) {
        return res.status(400).json({
          ok: false,
          message: "La respuesta correcta debe ser A, B, C o D"
        });
      }
    }

    const result = await runQuery(
      `INSERT INTO cuestionarios (
        id_asesor,
        titulo,
        descripcion,
        materia,
        estado_revision
      ) VALUES (?, ?, ?, ?, 'pendiente_revision')`,
      [id_asesor, titulo, descripcion || null, materia]
    );

    const id_cuestionario = result.lastID;

    for (const p of preguntas) {
      await runQuery(
        `INSERT INTO preguntas (
          id_cuestionario,
          pregunta,
          opcion_a,
          opcion_b,
          opcion_c,
          opcion_d,
          respuesta_correcta
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id_cuestionario,
          p.pregunta,
          p.opcion_a,
          p.opcion_b,
          p.opcion_c,
          p.opcion_d,
          p.respuesta_correcta
        ]
      );
    }

    return res.status(201).json({
      ok: true,
      message: "Cuestionario creado correctamente con sus preguntas. Está en revisión.",
      cuestionario: {
        id_cuestionario,
        titulo,
        descripcion,
        materia,
        total_preguntas: preguntas.length,
        estado_revision: "pendiente_revision"
      }
    });
  } catch (error) {
    console.error("Error al crear cuestionario completo:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al crear cuestionario completo"
    });
  }
};

exports.agregarPregunta = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pregunta,
      opcion_a,
      opcion_b,
      opcion_c,
      opcion_d,
      respuesta_correcta
    } = req.body;

    if (!pregunta || !opcion_a || !opcion_b || !opcion_c || !opcion_d || !respuesta_correcta) {
      return res.status(400).json({
        ok: false,
        message: "Todos los campos de la pregunta son obligatorios"
      });
    }

    if (!["A", "B", "C", "D"].includes(respuesta_correcta)) {
      return res.status(400).json({
        ok: false,
        message: "La respuesta correcta debe ser A, B, C o D"
      });
    }

    const cuestionario = await getQuery(
      `SELECT id_cuestionario, id_asesor
       FROM cuestionarios
       WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    if (cuestionario.id_asesor !== req.user.id_usuario) {
      return res.status(403).json({
        ok: false,
        message: "No puedes modificar un cuestionario que no te pertenece"
      });
    }

    const result = await runQuery(
      `INSERT INTO preguntas (
        id_cuestionario,
        pregunta,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta]
    );

    return res.status(201).json({
      ok: true,
      message: "Pregunta agregada correctamente",
      id_pregunta: result.lastID
    });
  } catch (error) {
    console.error("Error al agregar pregunta:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al agregar pregunta"
    });
  }
};

exports.obtenerMisCuestionarios = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const cuestionarios = await allQuery(
      `SELECT
        q.id_cuestionario,
        q.titulo,
        q.descripcion,
        q.materia,
        q.estado_revision,
        q.motivo_revision,
        q.fecha_creacion,
        (
          SELECT COUNT(*)
          FROM preguntas p
          WHERE p.id_cuestionario = q.id_cuestionario
        ) AS total_preguntas
      FROM cuestionarios q
      WHERE q.id_asesor = ?
      ORDER BY q.fecha_creacion DESC`,
      [id_asesor]
    );

    return res.json({
      ok: true,
      cuestionarios
    });
  } catch (error) {
    console.error("Error al obtener cuestionarios:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener cuestionarios"
    });
  }
};



exports.obtenerPreguntasCuestionarioAsesor = async (req, res) => {
  try {
    const { id } = req.params;
    const id_asesor = req.user.id_usuario;

    const cuestionario = await getQuery(
      `SELECT
        q.id_cuestionario,
        q.titulo,
        q.descripcion,
        q.materia,
        q.estado_revision,
        q.motivo_revision,
        q.fecha_creacion
      FROM cuestionarios q
      WHERE q.id_cuestionario = ?
        AND q.id_asesor = ?`,
      [id, id_asesor]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    const preguntas = await allQuery(
      `SELECT
        id_pregunta,
        pregunta,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
      FROM preguntas
      WHERE id_cuestionario = ?
      ORDER BY id_pregunta ASC`,
      [id]
    );

    return res.json({
      ok: true,
      cuestionario,
      preguntas
    });
  } catch (error) {
    console.error("Error al obtener preguntas del cuestionario del asesor:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener preguntas del cuestionario"
    });
  }
};


exports.eliminarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const id_asesor = req.user.id_usuario;

    const cuestionario = await getQuery(
      `SELECT id_cuestionario, id_asesor, titulo
       FROM cuestionarios
       WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    if (Number(cuestionario.id_asesor) !== Number(id_asesor)) {
      return res.status(403).json({
        ok: false,
        message: "No puedes eliminar un cuestionario que no te pertenece"
      });
    }

    await runQuery(
      `DELETE FROM cuestionarios
       WHERE id_cuestionario = ?`,
      [id]
    );

    return res.json({
      ok: true,
      message: "Cuestionario eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar cuestionario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al eliminar el cuestionario"
    });
  }
};

exports.obtenerCuestionariosAprobados = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 12, 50);
    const busqueda = normalizarTexto(req.query.q);

    const where = ["q.estado_revision = 'aprobado'"];
    const params = [];

    if (busqueda) {
      const like = `%${busqueda}%`;
      where.push(`(
        q.titulo ILIKE ?
        OR q.materia ILIKE ?
        OR COALESCE(q.descripcion, '') ILIKE ?
        OR u.nombre ILIKE ?
      )`);
      params.push(like, like, like, like);
    }

    const whereSql = where.join(" AND ");

    const totalRow = await getQuery(
      `SELECT COUNT(*) AS total
       FROM cuestionarios q
       JOIN usuarios u ON q.id_asesor = u.id_usuario
       WHERE ${whereSql}`,
      params
    );

    const cuestionarios = await allQuery(
      `SELECT
        q.id_cuestionario,
        q.titulo,
        q.descripcion,
        q.materia,
        q.fecha_creacion,
        u.nombre AS nombre_asesor
      FROM cuestionarios q
      JOIN usuarios u ON q.id_asesor = u.id_usuario
      WHERE ${whereSql}
      ORDER BY q.fecha_creacion DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(totalRow?.total || 0);

    return res.json({
      ok: true,
      cuestionarios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Error al obtener cuestionarios aprobados:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener cuestionarios"
    });
  }
};

exports.obtenerPreguntasCuestionario = async (req, res) => {
  try {
    const { id } = req.params;

    const cuestionario = await getQuery(
      `SELECT id_cuestionario, estado_revision, titulo, materia
       FROM cuestionarios
       WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    if (cuestionario.estado_revision !== "aprobado") {
      return res.status(403).json({
        ok: false,
        message: "Este cuestionario no está disponible para alumnos"
      });
    }

    const preguntas = await allQuery(
      `SELECT
        id_pregunta,
        pregunta,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d
      FROM preguntas
      WHERE id_cuestionario = ?`,
      [id]
    );

    return res.json({
      ok: true,
      cuestionario: {
        id_cuestionario: cuestionario.id_cuestionario,
        titulo: cuestionario.titulo,
        materia: cuestionario.materia
      },
      preguntas
    });
  } catch (error) {
    console.error("Error al obtener preguntas:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener preguntas"
    });
  }
};

exports.responderCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestas } = req.body;
    const id_alumno = req.user.id_usuario;

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar un arreglo de respuestas"
      });
    }

    const cuestionario = await getQuery(
      `SELECT id_cuestionario, estado_revision
       FROM cuestionarios
       WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    if (cuestionario.estado_revision !== "aprobado") {
      return res.status(403).json({
        ok: false,
        message: "Este cuestionario no está disponible"
      });
    }

    const preguntas = await allQuery(
      `SELECT id_pregunta, respuesta_correcta
       FROM preguntas
       WHERE id_cuestionario = ?`,
      [id]
    );

    if (preguntas.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "El cuestionario no tiene preguntas"
      });
    }

    let correctas = 0;

    const detalle = preguntas.map((p) => {
      const respuestaAlumno = respuestas.find(
        (r) => Number(r.id_pregunta) === Number(p.id_pregunta)
      );

      const respuestaElegida =
        respuestaAlumno && respuestaAlumno.respuesta
          ? String(respuestaAlumno.respuesta).toUpperCase()
          : null;

      const respuestaCorrecta =
        String(p.respuesta_correcta || "").toUpperCase();

      const esCorrecta =
        Boolean(respuestaElegida) &&
        respuestaElegida === respuestaCorrecta;

      if (esCorrecta) {
        correctas++;
      }

      return {
        id_pregunta: p.id_pregunta,
        respuesta_alumno: respuestaElegida,
        respuesta_correcta: respuestaCorrecta,
        es_correcta: esCorrecta
      };
    });

    const total = preguntas.length;
    const puntaje = Number(((correctas / total) * 100).toFixed(2));

    await runQuery(
      `INSERT INTO resultados_cuestionario (
        id_cuestionario,
        id_alumno,
        puntaje,
        total_preguntas
      ) VALUES (?, ?, ?, ?)`,
      [id, id_alumno, puntaje, total]
    );

    return res.json({
      ok: true,
      message: "Cuestionario respondido correctamente",
      resultado: {
        correctas,
        total,
        puntaje,
        detalle
      }
    });
  } catch (error) {
    console.error("Error al responder cuestionario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al responder cuestionario"
    });
  }
};

exports.obtenerTodosLosCuestionarios = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 20, 100);
    const search = normalizarTexto(req.query.search).toLowerCase();
    const estado = normalizarTexto(req.query.estado).toLowerCase();

    const where = [];
    const params = [];

    if (["pendiente_revision", "aprobado", "rechazado", "oculto"].includes(estado)) {
      where.push("q.estado_revision = ?");
      params.push(estado);
    }

    if (search) {
      where.push(`(
        LOWER(q.titulo) LIKE ?
        OR LOWER(q.materia) LIKE ?
        OR LOWER(u.nombre) LIKE ?
        OR LOWER(COALESCE(q.descripcion, '')) LIKE ?
      )`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalFiltrado = await getQuery(
      `
      SELECT COUNT(*) AS total
      FROM cuestionarios q
      JOIN usuarios u ON q.id_asesor = u.id_usuario
      ${whereSql}
      `,
      params
    );

    const resumen = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado_revision = 'pendiente_revision' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado_revision = 'aprobado' THEN 1 ELSE 0 END), 0) AS aprobados,
        COALESCE(SUM(CASE WHEN estado_revision = 'rechazado' THEN 1 ELSE 0 END), 0) AS rechazados
      FROM cuestionarios
      `
    );

    const cuestionarios = await allQuery(
      `SELECT
        q.id_cuestionario,
        q.titulo,
        q.descripcion,
        q.materia,
        q.estado_revision,
        q.motivo_revision,
        q.fecha_creacion,
        u.nombre AS nombre_asesor,
        u.correo AS correo_asesor
      FROM cuestionarios q
      JOIN usuarios u ON q.id_asesor = u.id_usuario
      ${whereSql}
      ORDER BY q.fecha_creacion DESC, q.id_cuestionario DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(totalFiltrado?.total || 0);

    return res.json({
      ok: true,
      cuestionarios,
      resumen: {
        total: Number(resumen?.total || 0),
        pendientes: Number(resumen?.pendientes || 0),
        aprobados: Number(resumen?.aprobados || 0),
        rechazados: Number(resumen?.rechazados || 0)
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Error al obtener todos los cuestionarios:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener cuestionarios"
    });
  }
};

exports.aprobarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;

    const cuestionario = await getQuery(
      `SELECT id_cuestionario FROM cuestionarios WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    await runQuery(
      `UPDATE cuestionarios
       SET estado_revision = 'aprobado',
           motivo_revision = NULL
       WHERE id_cuestionario = ?`,
      [id]
    );

    return res.json({
      ok: true,
      message: "Cuestionario aprobado correctamente"
    });
  } catch (error) {
    console.error("Error al aprobar cuestionario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al aprobar cuestionario"
    });
  }
};

exports.rechazarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_revision } = req.body;

    const cuestionario = await getQuery(
      `SELECT id_cuestionario FROM cuestionarios WHERE id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    await runQuery(
      `UPDATE cuestionarios
       SET estado_revision = 'rechazado',
           motivo_revision = ?
       WHERE id_cuestionario = ?`,
      [motivo_revision || null, id]
    );

    return res.json({
      ok: true,
      message: "Cuestionario rechazado correctamente"
    });
  } catch (error) {
    console.error("Error al rechazar cuestionario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al rechazar cuestionario"
    });
  }
};
exports.obtenerPreguntasCuestionarioAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const cuestionario = await getQuery(
      `SELECT
        q.id_cuestionario,
        q.titulo,
        q.descripcion,
        q.materia,
        q.estado_revision,
        q.motivo_revision,
        q.fecha_creacion,
        u.nombre AS nombre_asesor,
        u.correo AS correo_asesor
      FROM cuestionarios q
      JOIN usuarios u ON q.id_asesor = u.id_usuario
      WHERE q.id_cuestionario = ?`,
      [id]
    );

    if (!cuestionario) {
      return res.status(404).json({
        ok: false,
        message: "Cuestionario no encontrado"
      });
    }

    const preguntas = await allQuery(
      `SELECT
        id_pregunta,
        pregunta,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
      FROM preguntas
      WHERE id_cuestionario = ?
      ORDER BY id_pregunta ASC`,
      [id]
    );

    return res.json({
      ok: true,
      cuestionario,
      preguntas
    });
  } catch (error) {
    console.error("Error al obtener preguntas del cuestionario para admin:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener preguntas del cuestionario"
    });
  }
};
