const bcrypt = require("bcryptjs");

const {
  runQuery,
  getQuery,
  allQuery
} = require("../utils/dbHelpers");




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


exports.seedAdmin = async (req, res) => {
  try {
    const correo = "admin@eduquak.com";

    const existing = await getQuery(
      `
      SELECT id_usuario
      FROM usuarios
      WHERE correo = $1
      `,
      [correo]
    );

    if (existing) {
      return res.json({
        ok: true,
        message: "El admin ya existe",
        credentials: {
          correo,
          password: "Admin123*"
        }
      });
    }

    const hashedPassword = await bcrypt.hash("Admin123*", 10);

    const result = await runQuery(
      `
      INSERT INTO usuarios (
        nombre,
        correo,
        password,
        rol,
        estado_validacion,
        institucion,
        telefono,
        badge_verificacion
      )
      VALUES (
        $1,
        $2,
        $3,
        'admin',
        'verificado',
        $4,
        $5,
        'Verificado'
      )
      RETURNING id_usuario
      `,
      [
        "Administrador General",
        correo,
        hashedPassword,
        "EduQuak",
        null
      ]
    );

    const id_usuario = result.rows[0].id_usuario;

    await runQuery(
      `
      INSERT INTO admins (
        id_usuario
      )
      VALUES ($1)
      `,
      [id_usuario]
    );

    return res.json({
      ok: true,
      message: "Admin creado correctamente",
      credentials: {
        correo,
        password: "Admin123*"
      }
    });
  } catch (error) {
    console.error("Error al crear admin:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al crear admin",
      error: error.message
    });
  }
};


exports.getPendingUsers = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 20, 100);
    const search = normalizarTexto(req.query.search).toLowerCase();
    const rol = normalizarTexto(req.query.rol).toLowerCase();
    const estado = normalizarTexto(req.query.estado).toLowerCase();

    const where = [
      "u.rol IN ('alumno', 'asesor')"
    ];

    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        LOWER(u.nombre) LIKE $${params.length}
        OR LOWER(u.correo) LIKE $${params.length}
      )`);
    }

    if (["alumno", "asesor"].includes(rol)) {
      params.push(rol);
      where.push(`u.rol = $${params.length}`);
    }

    if (["pendiente", "verificado", "rechazado"].includes(estado)) {
      params.push(estado);
      where.push(`u.estado_validacion = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalFiltradoRow = await getQuery(
      `
      SELECT COUNT(*)::int AS total
      FROM usuarios u
      ${whereSql}
      `,
      params
    );

    const resumen = await getQuery(
      `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN estado_validacion = 'pendiente' THEN 1 ELSE 0 END), 0)::int AS pendientes,
        COALESCE(SUM(CASE WHEN estado_validacion = 'verificado' THEN 1 ELSE 0 END), 0)::int AS verificados,
        COALESCE(SUM(CASE WHEN estado_validacion = 'rechazado' THEN 1 ELSE 0 END), 0)::int AS rechazados
      FROM usuarios
      WHERE rol IN ('alumno', 'asesor')
      `
    );

    const users = await allQuery(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.correo,
        u.rol,
        u.estado_validacion,
        u.badge_verificacion,
        u.institucion,
        u.telefono,
        u.fecha_registro,
        u.motivo_rechazo,
        u.fecha_rechazo,
        u.documento_reenviado,
        u.fecha_reenvio_documento,

        a.documento_estudiante_url AS documento_alumno,
        a.tipo_documento AS tipo_documento_alumno,

        s.documento_respaldo_url AS documento_asesor,
        s.tipo_documento AS tipo_documento_asesor,
        s.especialidad,
        s.materias

      FROM usuarios u

      LEFT JOIN alumnos a
        ON u.id_usuario = a.id_usuario

      LEFT JOIN asesores s
        ON u.id_usuario = s.id_usuario

      ${whereSql}

      ORDER BY u.fecha_registro DESC, u.id_usuario DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    const usersFormateados = users.map((u) => {
      let documento_url = null;
      let tipo_documento = null;

      if (u.rol === "alumno") {
        documento_url = u.documento_alumno;
        tipo_documento = u.tipo_documento_alumno;
      }

      if (u.rol === "asesor") {
        documento_url = u.documento_asesor;
        tipo_documento = u.tipo_documento_asesor;
      }

      return {
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        estado_validacion: u.estado_validacion,
        badge_verificacion: u.badge_verificacion,
        institucion: u.institucion,
        telefono: u.telefono,
        fecha_registro: u.fecha_registro,
        motivo_rechazo: u.motivo_rechazo || null,
        fecha_rechazo: u.fecha_rechazo || null,
        documento_reenviado: Number(u.documento_reenviado || 0),
        fecha_reenvio_documento: u.fecha_reenvio_documento || null,
        especialidad: u.especialidad || null,
        materias: u.materias || null,
        documento_url,
        tipo_documento
      };
    });

    const total = Number(totalFiltradoRow?.total || 0);

    return res.json({
      ok: true,
      users: usersFormateados,
      resumen: {
        total: Number(resumen?.total || 0),
        pendientes: Number(resumen?.pendientes || 0),
        verificados: Number(resumen?.verificados || 0),
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
    console.error("Error al obtener usuarios:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener usuarios",
      error: error.message
    });
  }
};


exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getQuery(
      `
      SELECT id_usuario, rol
      FROM usuarios
      WHERE id_usuario = $1
      `,
      [id]
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    if (user.rol === "admin") {
      return res.status(403).json({
        ok: false,
        message: "No puedes modificar a un administrador"
      });
    }

    await runQuery(
      `
      UPDATE usuarios
      SET
        estado_validacion = 'verificado',
        badge_verificacion = 'Verificado',
        motivo_rechazo = NULL,
        fecha_rechazo = NULL,
        documento_reenviado = FALSE,
        fecha_reenvio_documento = NULL
      WHERE id_usuario = $1
      `,
      [id]
    );

    return res.json({
      ok: true,
      message: "Usuario verificado correctamente"
    });
  } catch (error) {
    console.error("Error al aprobar usuario:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al aprobar usuario",
      error: error.message
    });
  }
};


exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      motivo_revision,
      motivo_rechazo
    } = req.body || {};

    const motivo =
      String(motivo_revision || motivo_rechazo || "").trim() || null;

    const user = await getQuery(
      `
      SELECT id_usuario, rol
      FROM usuarios
      WHERE id_usuario = $1
      `,
      [id]
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    if (user.rol === "admin") {
      return res.status(403).json({
        ok: false,
        message: "No puedes modificar a un administrador"
      });
    }

    await runQuery(
      `
      UPDATE usuarios
      SET
        estado_validacion = 'rechazado',
        badge_verificacion = 'Rechazado',
        motivo_rechazo = $1,
        fecha_rechazo = CURRENT_TIMESTAMP,
        documento_reenviado = FALSE
      WHERE id_usuario = $2
      `,
      [motivo, id]
    );

    return res.json({
      ok: true,
      message: "Usuario rechazado correctamente"
    });
  } catch (error) {
    console.error("Error al rechazar usuario:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al rechazar usuario",
      error: error.message
    });
  }
};


exports.obtenerReportesAsesorias = async (req, res) => {
  try {
    const { page, limit, offset } = normalizarPaginacion(req, 20, 100);
    const estado = normalizarTexto(req.query.estado).toLowerCase();
    const search = normalizarTexto(req.query.search).toLowerCase();
    const fechaInicio = normalizarTexto(req.query.fechaInicio);
    const fechaFin = normalizarTexto(req.query.fechaFin);

    const where = [];
    const params = [];
    const resumenWhere = [];
    const resumenParams = [];

    function agregarFiltroCompartido(sqlFactory, valor) {
      params.push(valor);
      where.push(sqlFactory(params.length));

      resumenParams.push(valor);
      resumenWhere.push(sqlFactory(resumenParams.length));
    }

    if (["pendiente", "revisado", "resuelto"].includes(estado)) {
      params.push(estado);
      where.push(`r.estado = $${params.length}`);
    }

    if (search) {
      agregarFiltroCompartido(
        (index) => `(
        LOWER(alumno.nombre) LIKE $${index}
        OR LOWER(asesor.nombre) LIKE $${index}
        OR LOWER(r.motivo) LIKE $${index}
        OR LOWER(COALESCE(r.descripcion, '')) LIKE $${index}
      )`,
        `%${search}%`
      );
    }

    if (fechaInicio) {
      agregarFiltroCompartido(
        (index) => `r.fecha_reporte >= $${index}::date`,
        fechaInicio
      );
    }

    if (fechaFin) {
      agregarFiltroCompartido(
        (index) => `r.fecha_reporte < ($${index}::date + INTERVAL '1 day')`,
        fechaFin
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const resumenWhereSql = resumenWhere.length ? `WHERE ${resumenWhere.join(" AND ")}` : "";

    const totalFiltradoRow = await getQuery(
      `
      SELECT COUNT(*)::int AS total
      FROM reportes_asesoria r
      JOIN usuarios alumno ON r.id_alumno = alumno.id_usuario
      JOIN usuarios asesor ON r.id_asesor = asesor.id_usuario
      ${whereSql}
      `,
      params
    );

    const reportes = await allQuery(
      `
      SELECT
        r.id_reporte,
        r.id_asesoria,
        r.id_alumno,
        r.id_asesor,
        r.motivo,
        r.descripcion,
        r.estado,
        r.fecha_reporte,
        r.evidencia_url,
        r.tipo_evidencia,
        r.fecha_revisado,
        r.fecha_resuelto,
        r.ultima_actualizacion,

        alumno.nombre AS nombre_alumno,
        alumno.correo AS correo_alumno,

        asesor.nombre AS nombre_asesor,
        asesor.correo AS correo_asesor,

        sancion_alumno.id_sancion AS sancion_alumno_id,
        sancion_alumno.motivo AS sancion_alumno_motivo,
        sancion_alumno.fecha_fin AS sancion_alumno_hasta,

        sancion_asesor.id_sancion AS sancion_asesor_id,
        sancion_asesor.motivo AS sancion_asesor_motivo,
        sancion_asesor.fecha_fin AS sancion_asesor_hasta,

        a.fecha AS fecha_asesoria,
        a.hora AS hora_asesoria,
        a.tipo AS tipo_asesoria,
        a.mensaje AS mensaje_asesoria,

        (
          SELECT COUNT(*)
          FROM reportes_asesoria rr
          WHERE rr.id_asesor = r.id_asesor
        ) AS total_reportes

      FROM reportes_asesoria r

      JOIN usuarios alumno
        ON r.id_alumno = alumno.id_usuario

      JOIN usuarios asesor
        ON r.id_asesor = asesor.id_usuario

      JOIN asesorias a
        ON r.id_asesoria = a.id_asesoria

      LEFT JOIN LATERAL (
        SELECT id_sancion, motivo, fecha_fin
        FROM sanciones_usuario
        WHERE id_usuario = r.id_alumno
          AND estado = 'activa'
          AND fecha_fin > (NOW() AT TIME ZONE 'America/Mexico_City')
        ORDER BY fecha_fin DESC
        LIMIT 1
      ) sancion_alumno ON TRUE

      LEFT JOIN LATERAL (
        SELECT id_sancion, motivo, fecha_fin
        FROM sanciones_usuario
        WHERE id_usuario = r.id_asesor
          AND estado = 'activa'
          AND fecha_fin > (NOW() AT TIME ZONE 'America/Mexico_City')
        ORDER BY fecha_fin DESC
        LIMIT 1
      ) sancion_asesor ON TRUE

      ${whereSql}

      ORDER BY
        CASE r.estado
          WHEN 'pendiente' THEN 1
          WHEN 'revisado' THEN 2
          WHEN 'resuelto' THEN 3
          ELSE 4
        END,
        total_reportes DESC,
        r.fecha_reporte DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    const resumen = await getQuery(
      `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0)::int AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'revisado' THEN 1 ELSE 0 END), 0)::int AS revisados,
        COALESCE(SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END), 0)::int AS resueltos
      FROM reportes_asesoria r
      JOIN usuarios alumno ON r.id_alumno = alumno.id_usuario
      JOIN usuarios asesor ON r.id_asesor = asesor.id_usuario
      ${resumenWhereSql}
      `,
      resumenParams
    );

    const total = Number(totalFiltradoRow?.total || 0);

    return res.json({
      ok: true,
      reportes,
      resumen: {
        total: Number(resumen?.total || 0),
        pendientes: Number(resumen?.pendientes || 0),
        revisados: Number(resumen?.revisados || 0),
        resueltos: Number(resumen?.resueltos || 0)
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Error al obtener reportes:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener reportes",
      error: error.message
    });
  }
};


exports.actualizarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body || {};

    const estadosPermitidos = [
      "pendiente",
      "revisado",
      "resuelto"
    ];

    if (!estado || !estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: "Estado inválido. Usa: pendiente, revisado o resuelto"
      });
    }

    const reporte = await getQuery(
      `
      SELECT id_reporte
      FROM reportes_asesoria
      WHERE id_reporte = $1
      `,
      [id]
    );

    if (!reporte) {
      return res.status(404).json({
        ok: false,
        message: "Reporte no encontrado"
      });
    }

    let updateSql;
    let updateParams;

    if (estado === "pendiente") {
      updateSql = `
        UPDATE reportes_asesoria
        SET
          estado = $1,
          fecha_revisado = NULL,
          fecha_resuelto = NULL,
          ultima_actualizacion = CURRENT_TIMESTAMP
        WHERE id_reporte = $2
      `;
      updateParams = [estado, id];
    } else if (estado === "revisado") {
      updateSql = `
        UPDATE reportes_asesoria
        SET
          estado = $1,
          fecha_revisado = COALESCE(fecha_revisado, CURRENT_TIMESTAMP),
          fecha_resuelto = NULL,
          ultima_actualizacion = CURRENT_TIMESTAMP
        WHERE id_reporte = $2
      `;
      updateParams = [estado, id];
    } else {
      updateSql = `
        UPDATE reportes_asesoria
        SET
          estado = $1,
          fecha_revisado = COALESCE(fecha_revisado, NOW() AT TIME ZONE 'America/Mexico_City'),
          fecha_resuelto = COALESCE(fecha_resuelto, NOW() AT TIME ZONE 'America/Mexico_City'),
          ultima_actualizacion = NOW() AT TIME ZONE 'America/Mexico_City'
        WHERE id_reporte = $2
      `;
      updateParams = [estado, id];
    }

    await runQuery(updateSql, updateParams);

    return res.json({
      ok: true,
      message: "Estado del reporte actualizado correctamente"
    });
  } catch (error) {
    console.error("Error al actualizar reporte:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al actualizar reporte",
      error: error.message
    });
  }
};


exports.aplicarSancionReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      objetivo,
      dias,
      motivo
    } = req.body || {};

    const objetivoNormalizado = String(objetivo || "").toLowerCase();
    const diasSancion = Math.max(1, Math.min(Number(dias || 0), 365));
    const motivoLimpio = normalizarTexto(motivo);

    if (!["alumno", "asesor"].includes(objetivoNormalizado)) {
      return res.status(400).json({
        ok: false,
        message: "Debes indicar si la sanción es para el alumno o el asesor"
      });
    }

    if (!diasSancion) {
      return res.status(400).json({
        ok: false,
        message: "La duración debe ser de al menos 1 día"
      });
    }

    if (!motivoLimpio) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo de la sanción"
      });
    }

    const reporte = await getQuery(
      `
      SELECT
        r.id_reporte,
        r.id_alumno,
        r.id_asesor,
        alumno.nombre AS nombre_alumno,
        asesor.nombre AS nombre_asesor
      FROM reportes_asesoria r
      JOIN usuarios alumno ON r.id_alumno = alumno.id_usuario
      JOIN usuarios asesor ON r.id_asesor = asesor.id_usuario
      WHERE r.id_reporte = $1
      `,
      [id]
    );

    if (!reporte) {
      return res.status(404).json({
        ok: false,
        message: "Reporte no encontrado"
      });
    }

    const idUsuarioSancionado = objetivoNormalizado === "alumno"
      ? reporte.id_alumno
      : reporte.id_asesor;

    await runQuery(
      `
      UPDATE sanciones_usuario
      SET estado = 'cancelada'
      WHERE id_usuario = $1
        AND estado = 'activa'
        AND fecha_fin > (NOW() AT TIME ZONE 'America/Mexico_City')
      `,
      [idUsuarioSancionado]
    );

    const result = await runQuery(
      `
      INSERT INTO sanciones_usuario (
        id_usuario,
        id_reporte,
        aplicada_por,
        motivo,
        fecha_inicio,
        fecha_fin
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW() AT TIME ZONE 'America/Mexico_City',
        (NOW() AT TIME ZONE 'America/Mexico_City') + ($5::int * INTERVAL '1 day')
      )
      RETURNING id_sancion, fecha_inicio, fecha_fin
      `,
      [
        idUsuarioSancionado,
        id,
        req.user.id_usuario,
        motivoLimpio,
        diasSancion
      ]
    );

    await runQuery(
      `
      UPDATE reportes_asesoria
      SET
        estado = 'resuelto',
        fecha_revisado = COALESCE(fecha_revisado, NOW() AT TIME ZONE 'America/Mexico_City'),
        fecha_resuelto = COALESCE(fecha_resuelto, NOW() AT TIME ZONE 'America/Mexico_City'),
        ultima_actualizacion = NOW() AT TIME ZONE 'America/Mexico_City'
      WHERE id_reporte = $1
      `,
      [id]
    );

    const sancion = result.rows[0];

    return res.json({
      ok: true,
      message: "Sanción aplicada correctamente",
      sancion: {
        ...sancion,
        id_usuario: idUsuarioSancionado,
        objetivo: objetivoNormalizado,
        dias: diasSancion,
        motivo: motivoLimpio
      }
    });
  } catch (error) {
    console.error("Error al aplicar sanción:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al aplicar sanción",
      error: error.message
    });
  }
};
