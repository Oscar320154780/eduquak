const bcrypt = require("bcryptjs");

const {
  runQuery,
  getQuery,
  allQuery
} = require("../utils/dbHelpers");

/* =========================
   SEED ADMIN TEMPORAL
========================= */

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

/* =========================
   VER USUARIOS
========================= */

exports.getPendingUsers = async (req, res) => {
  try {
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

      WHERE u.rol IN ('alumno', 'asesor')

      ORDER BY u.fecha_registro DESC
      `
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

    return res.json({
      ok: true,
      users: usersFormateados
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

/* =========================
   APROBAR USUARIO
========================= */

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

/* =========================
   RECHAZAR USUARIO
========================= */

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

/* =========================
   REPORTES DE ASESORÍAS
========================= */

exports.obtenerReportesAsesorias = async (req, res) => {
  try {
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

        alumno.nombre AS nombre_alumno,
        alumno.correo AS correo_alumno,

        asesor.nombre AS nombre_asesor,
        asesor.correo AS correo_asesor,

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

      ORDER BY
        CASE r.estado
          WHEN 'pendiente' THEN 1
          WHEN 'revisado' THEN 2
          WHEN 'resuelto' THEN 3
          ELSE 4
        END,
        total_reportes DESC,
        r.fecha_reporte DESC
      `
    );

    const resumen = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'revisado' THEN 1 ELSE 0 END), 0) AS revisados,
        COALESCE(SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END), 0) AS resueltos
      FROM reportes_asesoria
      `
    );

    return res.json({
      ok: true,
      reportes,
      resumen: {
        total: Number(resumen?.total || 0),
        pendientes: Number(resumen?.pendientes || 0),
        revisados: Number(resumen?.revisados || 0),
        resueltos: Number(resumen?.resueltos || 0)
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

/* =========================
   ACTUALIZAR ESTADO REPORTE
========================= */

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

    await runQuery(
      `
      UPDATE reportes_asesoria
      SET estado = $1
      WHERE id_reporte = $2
      `,
      [estado, id]
    );

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