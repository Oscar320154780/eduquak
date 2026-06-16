const db = require("../db");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
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

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
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

exports.obtenerMaterialesAprobados = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 12, 50);
    const busqueda = normalizarTexto(req.query.q);

    const where = ["m.estado_revision = 'aprobado'"];
    const params = [];

    if (busqueda) {
      const like = `%${busqueda}%`;
      where.push(`(
        m.titulo ILIKE ?
        OR m.materia ILIKE ?
        OR COALESCE(m.descripcion, '') ILIKE ?
        OR u.nombre ILIKE ?
      )`);
      params.push(like, like, like, like);
    }

    const whereSql = where.join(" AND ");

    const totalRow = await getQuery(
      `SELECT COUNT(*) AS total
       FROM materiales m
       JOIN usuarios u ON m.id_asesor = u.id_usuario
       WHERE ${whereSql}`,
      params
    );

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
      WHERE ${whereSql}
      ORDER BY m.fecha_subida DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(totalRow?.total || 0);

    return res.json({
      ok: true,
      materiales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Error al obtener materiales aprobados:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener materiales"
    });
  }
};

exports.obtenerTodosLosMateriales = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 20, 100);
    const search = normalizarTexto(req.query.search).toLowerCase();
    const estado = normalizarTexto(req.query.estado).toLowerCase();

    const where = [];
    const params = [];

    if (["pendiente_revision", "aprobado", "rechazado", "oculto"].includes(estado)) {
      where.push("m.estado_revision = ?");
      params.push(estado);
    }

    if (search) {
      where.push(`(
        LOWER(m.titulo) LIKE ?
        OR LOWER(m.materia) LIKE ?
        OR LOWER(u.nombre) LIKE ?
        OR LOWER(COALESCE(m.descripcion, '')) LIKE ?
      )`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalFiltrado = await getQuery(
      `
      SELECT COUNT(*) AS total
      FROM materiales m
      JOIN usuarios u ON m.id_asesor = u.id_usuario
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
      FROM materiales
      `
    );

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
      ${whereSql}
      ORDER BY m.fecha_subida DESC, m.id_material DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(totalFiltrado?.total || 0);

    return res.json({
      ok: true,
      materiales,
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
    console.error("Error al obtener todos los materiales:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener materiales"
    });
  }
};

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
