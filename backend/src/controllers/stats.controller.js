const {
  getQuery,
  allQuery
} = require("../utils/dbHelpers");


exports.obtenerStatsAsesor = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const asesorias = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'aceptada' THEN 1 ELSE 0 END), 0) AS aceptadas,
        COALESCE(SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END), 0) AS finalizadas,
        COALESCE(SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END), 0) AS rechazadas
      FROM asesorias
      WHERE id_asesor = $1
      `,
      [id_asesor]
    );

    const materiales = await getQuery(
      `
      SELECT COUNT(*) AS total
      FROM materiales
      WHERE id_asesor = $1
      `,
      [id_asesor]
    );

    const cuestionarios = await getQuery(
      `
      SELECT COUNT(*) AS total
      FROM cuestionarios
      WHERE id_asesor = $1
      `,
      [id_asesor]
    );

    const calificaciones = await getQuery(
      `
      SELECT
        promedio_calificacion,
        total_calificaciones
      FROM asesores
      WHERE id_usuario = $1
      `,
      [id_asesor]
    );

    return res.json({
      ok: true,
      stats: {
        asesorias: {
          total: Number(asesorias?.total || 0),
          pendientes: Number(asesorias?.pendientes || 0),
          aceptadas: Number(asesorias?.aceptadas || 0),
          finalizadas: Number(asesorias?.finalizadas || 0),
          rechazadas: Number(asesorias?.rechazadas || 0)
        },
        materiales: Number(materiales?.total || 0),
        cuestionarios: Number(cuestionarios?.total || 0),
        promedio_calificacion: Number(calificaciones?.promedio_calificacion || 0),
        total_calificaciones: Number(calificaciones?.total_calificaciones || 0)
      }
    });
  } catch (error) {
    console.error("Error al obtener estadísticas del asesor:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener estadísticas"
    });
  }
};


exports.obtenerStatsAdmin = async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    let filtroUsuarios = "";
    let filtroAsesorias = "";
    let filtroMateriales = "";
    let filtroCuestionarios = "";
    let filtroResenas = "";

    let params = [];

    if (inicio && fin) {
      params = [inicio, fin];

      filtroUsuarios = `
        WHERE DATE(fecha_registro)
        BETWEEN DATE($1)
        AND DATE($2)
      `;

      filtroAsesorias = `
        WHERE DATE(fecha_creacion)
        BETWEEN DATE($1)
        AND DATE($2)
      `;

      filtroMateriales = `
        WHERE DATE(fecha_subida)
        BETWEEN DATE($1)
        AND DATE($2)
      `;

      filtroCuestionarios = `
        WHERE DATE(fecha_creacion)
        BETWEEN DATE($1)
        AND DATE($2)
      `;

      filtroResenas = `
        WHERE DATE(fecha)
        BETWEEN DATE($1)
        AND DATE($2)
      `;
    }

    const usuarios = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN rol = 'alumno' THEN 1 ELSE 0 END), 0) AS alumnos,
        COALESCE(SUM(CASE WHEN rol = 'asesor' THEN 1 ELSE 0 END), 0) AS asesores,
        COALESCE(SUM(CASE WHEN rol = 'admin' THEN 1 ELSE 0 END), 0) AS admins,
        COALESCE(SUM(CASE WHEN estado_validacion = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado_validacion = 'verificado' THEN 1 ELSE 0 END), 0) AS verificados,
        COALESCE(SUM(CASE WHEN estado_validacion = 'rechazado' THEN 1 ELSE 0 END), 0) AS rechazados
      FROM usuarios
      ${filtroUsuarios}
      `,
      params
    );

    const asesorias = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'aceptada' THEN 1 ELSE 0 END), 0) AS aceptadas,
        COALESCE(SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END), 0) AS finalizadas,
        COALESCE(SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END), 0) AS rechazadas
      FROM asesorias
      ${filtroAsesorias}
      `,
      params
    );

    const materiales = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado_revision = 'pendiente_revision' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado_revision = 'aprobado' THEN 1 ELSE 0 END), 0) AS aprobados,
        COALESCE(SUM(CASE WHEN estado_revision = 'rechazado' THEN 1 ELSE 0 END), 0) AS rechazados,
        COALESCE(SUM(CASE WHEN estado_revision = 'oculto' THEN 1 ELSE 0 END), 0) AS ocultos
      FROM materiales
      ${filtroMateriales}
      `,
      params
    );

    const cuestionarios = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN estado_revision = 'pendiente_revision' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado_revision = 'aprobado' THEN 1 ELSE 0 END), 0) AS aprobados,
        COALESCE(SUM(CASE WHEN estado_revision = 'rechazado' THEN 1 ELSE 0 END), 0) AS rechazados,
        COALESCE(SUM(CASE WHEN estado_revision = 'oculto' THEN 1 ELSE 0 END), 0) AS ocultos
      FROM cuestionarios
      ${filtroCuestionarios}
      `,
      params
    );

    const resenas = await getQuery(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(ROUND(AVG(calificacion), 2), 0) AS promedio_general
      FROM resenas_asesor
      ${filtroResenas}
      `,
      params
    );

    return res.json({
      ok: true,
      stats: {
        usuarios: {
          total: Number(usuarios?.total || 0),
          alumnos: Number(usuarios?.alumnos || 0),
          asesores: Number(usuarios?.asesores || 0),
          admins: Number(usuarios?.admins || 0),
          pendientes: Number(usuarios?.pendientes || 0),
          verificados: Number(usuarios?.verificados || 0),
          rechazados: Number(usuarios?.rechazados || 0)
        },
        asesorias: {
          total: Number(asesorias?.total || 0),
          pendientes: Number(asesorias?.pendientes || 0),
          aceptadas: Number(asesorias?.aceptadas || 0),
          finalizadas: Number(asesorias?.finalizadas || 0),
          rechazadas: Number(asesorias?.rechazadas || 0)
        },
        materiales: {
          total: Number(materiales?.total || 0),
          pendientes: Number(materiales?.pendientes || 0),
          aprobados: Number(materiales?.aprobados || 0),
          rechazados: Number(materiales?.rechazados || 0),
          ocultos: Number(materiales?.ocultos || 0)
        },
        cuestionarios: {
          total: Number(cuestionarios?.total || 0),
          pendientes: Number(cuestionarios?.pendientes || 0),
          aprobados: Number(cuestionarios?.aprobados || 0),
          rechazados: Number(cuestionarios?.rechazados || 0),
          ocultos: Number(cuestionarios?.ocultos || 0)
        },
        resenas: {
          total: Number(resenas?.total || 0),
          promedio_general: Number(resenas?.promedio_general || 0)
        }
      }
    });
  } catch (error) {
    console.error("Error al obtener estadísticas del admin:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener estadísticas del administrador"
    });
  }
};


exports.obtenerTopAsesores = async (req, res) => {
  try {
    const topAsesores = await allQuery(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.correo,
        COUNT(r.id_resena) AS total_resenas,
        COALESCE(ROUND(AVG(r.calificacion), 2), 0) AS promedio
      FROM usuarios u
      LEFT JOIN resenas_asesor r
        ON u.id_usuario = r.id_asesor
      WHERE u.rol = 'asesor'
      GROUP BY
        u.id_usuario,
        u.nombre,
        u.correo
      HAVING COUNT(r.id_resena) > 0
      ORDER BY
        promedio DESC,
        total_resenas DESC
      LIMIT 10
      `
    );

    return res.json({
      ok: true,
      asesores: topAsesores
    });
  } catch (error) {
    console.error("Error obtenerTopAsesores:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener top de asesores"
    });
  }
};
