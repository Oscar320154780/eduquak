// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const db = require("../db");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");

// Ejecuta consultas SQL que modifican datos, como INSERT, UPDATE o DELETE, y devuelve el resultado de SQLite.
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
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

// Ejecuta una consulta SQL cuando solo esperamos un registro de respuesta.
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Controla la lógica de subir material: recibe la petición, habla con la base de datos y responde al frontend.
exports.subirMaterial = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;
    const { titulo, descripcion, materia } = req.body;

    if (!titulo || !materia) {
      return res.status(400).json({
        ok: false,
        message: "Título y materia son obligatorios"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Debes subir un archivo PDF"
      });
    }

    const uploadedMaterial = await uploadBufferToCloudinary(req.file, "materiales");
    const archivo_url = uploadedMaterial.url;

    const result = await runQuery(
      `INSERT INTO materiales (
        id_asesor,
        titulo,
        descripcion,
        materia,
        archivo_url,
        estado_revision
      ) VALUES (?, ?, ?, ?, ?, 'pendiente_revision')`,
      [id_asesor, titulo, descripcion || null, materia, archivo_url]
    );

    return res.status(201).json({
      ok: true,
      message: "Material subido correctamente. Quedó en revisión.",
      material: {
        id_material: result.lastID,
        titulo,
        descripcion,
        materia,
        archivo_url,
        estado_revision: "pendiente_revision"
      }
    });
  } catch (error) {
    console.error("Error al subir material:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al subir material"
    });
  }
};

// Controla la lógica de obtener mis materiales: recibe la petición, habla con la base de datos y responde al frontend.
exports.obtenerMisMateriales = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const materiales = await allQuery(
      `SELECT
        id_material,
        titulo,
        descripcion,
        materia,
        archivo_url,
        estado_revision,
        motivo_revision,
        fecha_subida
      FROM materiales
      WHERE id_asesor = ?
      ORDER BY fecha_subida DESC`,
      [id_asesor]
    );

    return res.json({
      ok: true,
      materiales
    });
  } catch (error) {
    console.error("Error al obtener materiales:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener materiales"
    });
  }
};

// ASESOR: eliminar su material
exports.eliminarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const id_asesor = req.user.id_usuario;

    const material = await getQuery(
      `SELECT id_material, id_asesor, titulo
       FROM materiales
       WHERE id_material = ?`,
      [id]
    );

    if (!material) {
      return res.status(404).json({
        ok: false,
        message: "Material no encontrado"
      });
    }

    if (Number(material.id_asesor) !== Number(id_asesor)) {
      return res.status(403).json({
        ok: false,
        message: "No puedes eliminar un material que no te pertenece"
      });
    }

    await runQuery(
      `DELETE FROM materiales
       WHERE id_material = ?`,
      [id]
    );

    return res.json({
      ok: true,
      message: "Material eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar material:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al eliminar el material"
    });
  }
};

// Controla la lógica de obtener materiales aprobados: recibe la petición, habla con la base de datos y responde al frontend.
exports.obtenerMaterialesAprobados = async (req, res) => {
  try {
    const materiales = await allQuery(
      `SELECT
        m.id_material,
        m.titulo,
        m.descripcion,
        m.materia,
        m.archivo_url,
        m.fecha_subida,
        u.nombre AS nombre_asesor
      FROM materiales m
      JOIN usuarios u ON m.id_asesor = u.id_usuario
      WHERE m.estado_revision = 'aprobado'
      ORDER BY m.fecha_subida DESC`
    );

    return res.json({
      ok: true,
      materiales
    });
  } catch (error) {
    console.error("Error al obtener materiales aprobados:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener materiales"
    });
  }
};

// ADMIN: ver todos los materiales
exports.obtenerTodosLosMateriales = async (req, res) => {
  try {
    const materiales = await allQuery(
      `SELECT
        m.id_material,
        m.titulo,
        m.descripcion,
        m.materia,
        m.archivo_url,
        m.estado_revision,
        m.motivo_revision,
        m.fecha_subida,
        u.nombre AS nombre_asesor,
        u.correo AS correo_asesor
      FROM materiales m
      JOIN usuarios u ON m.id_asesor = u.id_usuario
      ORDER BY m.fecha_subida DESC`
    );

    return res.json({
      ok: true,
      materiales
    });
  } catch (error) {
    console.error("Error al obtener todos los materiales:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener materiales"
    });
  }
};

// ADMIN: aprobar material
exports.aprobarMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await getQuery(
      `SELECT id_material FROM materiales WHERE id_material = ?`,
      [id]
    );

    if (!material) {
      return res.status(404).json({
        ok: false,
        message: "Material no encontrado"
      });
    }

    await runQuery(
      `UPDATE materiales
       SET estado_revision = 'aprobado',
           motivo_revision = NULL
       WHERE id_material = ?`,
      [id]
    );

    return res.json({
      ok: true,
      message: "Material aprobado correctamente"
    });
  } catch (error) {
    console.error("Error al aprobar material:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al aprobar material"
    });
  }
};

// ADMIN: rechazar material
exports.rechazarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_revision } = req.body;

    const material = await getQuery(
      `SELECT id_material FROM materiales WHERE id_material = ?`,
      [id]
    );

    if (!material) {
      return res.status(404).json({
        ok: false,
        message: "Material no encontrado"
      });
    }

    await runQuery(
      `UPDATE materiales
       SET estado_revision = 'rechazado',
           motivo_revision = ?
       WHERE id_material = ?`,
      [motivo_revision || null, id]
    );

    return res.json({
      ok: true,
      message: "Material rechazado correctamente"
    });
  } catch (error) {
    console.error("Error al rechazar material:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al rechazar material"
    });
  }
};