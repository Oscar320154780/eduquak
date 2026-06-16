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

exports.crearResena = async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, comentario } = req.body;
    const id_alumno = req.user.id_usuario;

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        ok: false,
        message: "La calificación debe estar entre 1 y 5"
      });
    }

    const asesoria = await getQuery(
      `SELECT id_asesoria, id_alumno, id_asesor, estado
       FROM asesorias
       WHERE id_asesoria = ?`,
      [id]
    );

    if (!asesoria) {
      return res.status(404).json({
        ok: false,
        message: "Asesoría no encontrada"
      });
    }

    if (asesoria.id_alumno !== id_alumno) {
      return res.status(403).json({
        ok: false,
        message: "No puedes calificar una asesoría que no te pertenece"
      });
    }

    if (asesoria.estado !== "finalizada") {
      return res.status(400).json({
        ok: false,
        message: "Solo puedes calificar asesorías finalizadas"
      });
    }

    const existente = await getQuery(
      `SELECT id_resena
       FROM resenas_asesor
       WHERE id_asesoria = ?`,
      [id]
    );

    if (existente) {
      return res.status(409).json({
        ok: false,
        message: "Ya calificaste esta asesoría"
      });
    }

    await runQuery(
      `INSERT INTO resenas_asesor (
        id_asesoria,
        id_alumno,
        id_asesor,
        calificacion,
        comentario
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, id_alumno, asesoria.id_asesor, calificacion, comentario || null]
    );

    const stats = await getQuery(
      `SELECT 
         ROUND(AVG(calificacion), 2) AS promedio,
         COUNT(*) AS total
       FROM resenas_asesor
       WHERE id_asesor = ?`,
      [asesoria.id_asesor]
    );

    await runQuery(
      `UPDATE asesores
       SET promedio_calificacion = ?, total_calificaciones = ?
       WHERE id_usuario = ?`,
      [stats.promedio || 0, stats.total || 0, asesoria.id_asesor]
    );

    return res.status(201).json({
      ok: true,
      message: "Reseña guardada correctamente",
      resumen: {
        promedio: Number(stats.promedio || 0),
        total_calificaciones: Number(stats.total || 0)
      }
    });
  } catch (error) {
    console.error("Error al crear reseña:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al guardar la reseña"
    });
  }
};

exports.obtenerMisResenas = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const resumen = await getQuery(
      `SELECT 
         ROUND(AVG(calificacion), 2) AS promedio,
         COUNT(*) AS total
       FROM resenas_asesor
       WHERE id_asesor = ?`,
      [id_asesor]
    );

    const resenas = await allQuery(
      `SELECT 
         r.id_resena,
         r.id_asesoria,
         COALESCE(n.numero_asesoria_asesor, 0) AS numero_asesoria_asesor,
         r.calificacion,
         r.comentario,
         r.fecha AS fecha_resena,
         u.nombre AS nombre_alumno
       FROM resenas_asesor r
       JOIN usuarios u ON r.id_alumno = u.id_usuario
       LEFT JOIN (
         SELECT
           id_asesoria,
           ROW_NUMBER() OVER (PARTITION BY id_asesor ORDER BY fecha ASC NULLS LAST, hora ASC NULLS LAST, id_asesoria ASC) AS numero_asesoria_asesor
         FROM asesorias
       ) n ON n.id_asesoria = r.id_asesoria
       WHERE r.id_asesor = ?
       ORDER BY r.fecha DESC`,
      [id_asesor]
    );

    return res.json({
      ok: true,
      resumen: {
        promedio: Number(resumen?.promedio || 0),
        total: Number(resumen?.total || 0)
      },
      resenas
    });
  } catch (error) {
    console.error("Error al obtener reseñas del asesor:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener reseñas"
    });
  }
};

exports.obtenerResenasDeAsesor = async (req, res) => {
  try {
    const { id_asesor } = req.params;

    const resenas = await allQuery(
      `SELECT 
         r.id_resena,
         r.id_asesoria,
         COALESCE(n.numero_asesoria_asesor, 0) AS numero_asesoria_asesor,
         r.calificacion,
         r.comentario,
         r.fecha AS fecha_resena,
         u.nombre AS nombre_alumno
       FROM resenas_asesor r
       JOIN usuarios u ON r.id_alumno = u.id_usuario
       LEFT JOIN (
         SELECT
           id_asesoria,
           ROW_NUMBER() OVER (PARTITION BY id_asesor ORDER BY fecha ASC NULLS LAST, hora ASC NULLS LAST, id_asesoria ASC) AS numero_asesoria_asesor
         FROM asesorias
       ) n ON n.id_asesoria = r.id_asesoria
       WHERE r.id_asesor = ?
       ORDER BY r.fecha DESC`,
      [id_asesor]
    );

    return res.json({
      ok: true,
      resenas
    });
  } catch (error) {
    console.error("Error al obtener reseñas:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener reseñas"
    });
  }
};
