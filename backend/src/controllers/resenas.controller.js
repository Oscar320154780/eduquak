// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const db = require("../db");

// Ejecuta consultas SQL que modifican datos, como INSERT, UPDATE o DELETE, y devuelve el resultado de SQLite.
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Ejecuta una consulta SQL cuando solo esperamos un registro de respuesta.
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Ejecuta una consulta SQL cuando necesitamos una lista completa de registros.
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// alumno califica asesor después de asesoría finalizada
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

// asesor ve SUS propias reseñas
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
         r.calificacion,
         r.comentario,
         r.fecha AS fecha_resena,
         u.nombre AS nombre_alumno
       FROM resenas_asesor r
       JOIN usuarios u ON r.id_alumno = u.id_usuario
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

// ver reseñas de un asesor específico
exports.obtenerResenasDeAsesor = async (req, res) => {
  try {
    const { id_asesor } = req.params;

    const resenas = await allQuery(
      `SELECT 
         r.id_resena,
         r.id_asesoria,
         r.calificacion,
         r.comentario,
         r.fecha AS fecha_resena,
         u.nombre AS nombre_alumno
       FROM resenas_asesor r
       JOIN usuarios u ON r.id_alumno = u.id_usuario
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