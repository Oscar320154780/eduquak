const bcrypt = require("bcryptjs");

const {
  runQuery,
  getQuery,
  allQuery
} = require("../utils/dbHelpers");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");


exports.getMe = async (req, res) => {

  try {

    let user;

    if (req.user.rol === "asesor") {

      user = await getQuery(

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

          a.especialidad,
          a.materias,
          a.descripcion,
          a.modalidad,
          a.promedio_calificacion,
          a.total_calificaciones,
          a.tipo_documento,
          a.documento_respaldo_url,
          COALESCE(a.precio_individual, 100) AS precio_individual,
          COALESCE(cpa.estado = 'conectada', a.mp_conectado, false) AS mp_conectado,
          COALESCE(cpa.mp_user_id, a.mp_user_id) AS mp_user_id,
          cpa.fecha_conexion AS mp_fecha_conexion,
          cpa.live_mode AS mp_live_mode,

          u.motivo_rechazo,
          u.fecha_rechazo,
          u.documento_reenviado,
          u.fecha_reenvio_documento

        FROM usuarios u

        LEFT JOIN asesores a
        ON u.id_usuario = a.id_usuario

        LEFT JOIN cuentas_pago_asesor cpa
        ON cpa.id_usuario = u.id_usuario
        AND cpa.estado = 'conectada'

        WHERE u.id_usuario = $1
        `,

        [req.user.id_usuario]

      );

    }

    else if (req.user.rol === "alumno") {

      user = await getQuery(

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

          al.tipo_documento,
          al.documento_estudiante_url,

          u.motivo_rechazo,
          u.fecha_rechazo,
          u.documento_reenviado,
          u.fecha_reenvio_documento

        FROM usuarios u

        LEFT JOIN alumnos al
        ON u.id_usuario = al.id_usuario

        WHERE u.id_usuario = $1
        `,

        [req.user.id_usuario]

      );

    }

    else {

      user = await getQuery(

        `
        SELECT

          id_usuario,
          nombre,
          correo,
          rol,
          estado_validacion,
          badge_verificacion,
          institucion,
          telefono,
          motivo_rechazo,
          fecha_rechazo,
          documento_reenviado,
          fecha_reenvio_documento,
          fecha_registro

        FROM usuarios

        WHERE id_usuario = $1
        `,

        [req.user.id_usuario]

      );

    }

    if (!user) {

      return res.status(404).json({

        ok: false,

        message:
          "Usuario no encontrado"

      });

    }

    const sancionActiva = await getQuery(
      `
      SELECT
        id_sancion,
        motivo,
        fecha_inicio,
        fecha_fin,
        estado
      FROM sanciones_usuario
      WHERE id_usuario = $1
        AND estado = 'activa'
        AND fecha_fin > (NOW() AT TIME ZONE 'America/Mexico_City')
      ORDER BY fecha_fin DESC
      LIMIT 1
      `,
      [req.user.id_usuario]
    );

    user.sancion_activa = Boolean(sancionActiva);
    user.sancion = sancionActiva || null;

    return res.json({

      ok: true,

      user

    });

  } catch (error) {

    console.error(
      "Error en getMe:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al obtener el perfil",

      error:
        error.message

    });

  }

};


exports.updateMe = async (req, res) => {

  try {

    const id_usuario =
      req.user.id_usuario;

    const rol =
      req.user.rol;

    const {

      nombre,
      institucion,
      telefono,
      especialidad,
      materias,
      descripcion,
      modalidad,
      precio_individual

    } = req.body;

    if (!nombre || !institucion) {

      return res.status(400).json({

        ok: false,

        message:
          "Nombre e institución son obligatorios"

      });

    }

    await runQuery(

      `
      UPDATE usuarios

      SET

        nombre = $1,
        institucion = $2,
        telefono = $3

      WHERE id_usuario = $4
      `,

      [
        nombre,
        institucion,
        telefono || null,
        id_usuario
      ]

    );

    if (rol === "asesor") {

      if (!especialidad) {

        return res.status(400).json({

          ok: false,

          message:
            "La especialidad es obligatoria para asesores"

        });

      }

      const precioIndividualFinal = Number(precio_individual || process.env.PRECIO_BASE_ASESORIA || process.env.PRECIO_MINIMO_ASESORIA || 100);

      if (!precioIndividualFinal || precioIndividualFinal < Number(process.env.PRECIO_MINIMO_ASESORIA || 80)) {
        return res.status(400).json({
          ok: false,
          message: `El precio individual mínimo es de $${process.env.PRECIO_MINIMO_ASESORIA || 80} MXN`
        });
      }

      if (
        modalidad &&
        ![
          "virtual",
          "presencial",
          "ambas"
        ].includes(modalidad)
      ) {

        return res.status(400).json({

          ok: false,

          message:
            "La modalidad debe ser virtual, presencial o ambas"

        });

      }

      await runQuery(

        `
        UPDATE asesores

        SET

          especialidad = $1,
          materias = $2,
          descripcion = $3,
          modalidad = $4,
          precio_individual = $5

        WHERE id_usuario = $6
        `,

        [

          especialidad,

          materias || null,

          descripcion || null,

          modalidad || "virtual",

          precioIndividualFinal,

          id_usuario

        ]

      );

    }

    return res.json({

      ok: true,

      message:
        "Perfil actualizado correctamente"

    });

  } catch (error) {

    console.error(
      "Error updateMe:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al actualizar perfil",

      error:
        error.message

    });

  }

};


exports.updateMyPassword = async (req, res) => {

  try {

    const id_usuario =
      req.user.id_usuario;

    const {

      password_actual,
      password_nueva,
      password_confirmacion

    } = req.body;

    if (
      !password_actual ||
      !password_nueva ||
      !password_confirmacion
    ) {

      return res.status(400).json({

        ok: false,

        message:
          "Debes completar todos los campos"

      });

    }

    if (
      password_nueva.length < 6
    ) {

      return res.status(400).json({

        ok: false,

        message:
          "La nueva contraseña debe tener al menos 6 caracteres"

      });

    }

    if (
      password_nueva !==
      password_confirmacion
    ) {

      return res.status(400).json({

        ok: false,

        message:
          "La confirmación no coincide"

      });

    }

    const user = await getQuery(

      `
      SELECT

        id_usuario,
        password

      FROM usuarios

      WHERE id_usuario = $1
      `,

      [id_usuario]

    );

    if (!user) {

      return res.status(404).json({

        ok: false,

        message:
          "Usuario no encontrado"

      });

    }

    const coincide =
      await bcrypt.compare(
        password_actual,
        user.password
      );

    if (!coincide) {

      return res.status(400).json({

        ok: false,

        message:
          "La contraseña actual es incorrecta"

      });

    }

    const mismaPassword =
      await bcrypt.compare(
        password_nueva,
        user.password
      );

    if (mismaPassword) {

      return res.status(400).json({

        ok: false,

        message:
          "La nueva contraseña no puede ser igual"

      });

    }

    const hash =
      await bcrypt.hash(
        password_nueva,
        10
      );

    await runQuery(

      `
      UPDATE usuarios

      SET password = $1

      WHERE id_usuario = $2
      `,

      [
        hash,
        id_usuario
      ]

    );

    return res.json({

      ok: true,

      message:
        "Contraseña actualizada correctamente"

    });

  } catch (error) {

    console.error(
      "Error updateMyPassword:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al cambiar contraseña",

      error:
        error.message

    });

  }

};


exports.getAsesoresPublicos = async (req, res) => {

  try {

    const asesores =
      await allQuery(

        `
        SELECT

          u.id_usuario,
          u.nombre,
          u.correo,
          u.institucion,
          u.badge_verificacion,

          a.especialidad,
          a.materias,
          a.descripcion,
          a.modalidad,
          a.promedio_calificacion,
          a.total_calificaciones,
          COALESCE(a.precio_individual, $1) AS precio_individual,
          COALESCE(a.mp_conectado, false) AS mp_conectado

        FROM usuarios u

        JOIN asesores a
        ON u.id_usuario = a.id_usuario

        WHERE
          u.rol = 'asesor'
          AND
          u.estado_validacion = 'verificado'

        ORDER BY

          a.promedio_calificacion DESC,
          a.total_calificaciones DESC,
          u.nombre ASC
        `,
        [Number(process.env.PRECIO_BASE_ASESORIA || process.env.PRECIO_MINIMO_ASESORIA || 100)]
      );

    return res.json({

      ok: true,

      asesores

    });

  } catch (error) {

    console.error(
      "Error getAsesoresPublicos:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al obtener asesores"

    });

  }

};


exports.resubmitAlumnoDocument = async (req, res) => {

  try {

    const id_usuario =
      req.user.id_usuario;

    if (!req.file) {

      return res.status(400).json({

        ok: false,

        message:
          "Debes seleccionar un archivo"

      });

    }

    const uploadedDocument =
      await uploadBufferToCloudinary(
        req.file,
        "constancias"
      );

    await runQuery(

      `
      UPDATE alumnos

      SET

        documento_estudiante_url = $1,
        tipo_documento = $2

      WHERE id_usuario = $3
      `,

      [

        uploadedDocument.url,

        req.body.tipo_documento ||
          "constancia_estudios",

        id_usuario

      ]

    );

    await runQuery(

      `
      UPDATE usuarios

      SET

        estado_validacion = 'pendiente',

        badge_verificacion =
          'Reenviado para revisión',

        motivo_rechazo = NULL,

        documento_reenviado = TRUE,

        fecha_reenvio_documento =
          CURRENT_TIMESTAMP

      WHERE id_usuario = $1
      `,

      [id_usuario]

    );

    return res.json({

      ok: true,

      message:
        "Documento reenviado correctamente"

    });

  } catch (error) {

    console.error(
      "Error resubmitAlumnoDocument:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al reenviar documento",

      error:
        error.message

    });

  }

};


exports.resubmitAsesorDocument = async (req, res) => {

  try {

    const id_usuario =
      req.user.id_usuario;

    if (!req.file) {

      return res.status(400).json({

        ok: false,

        message:
          "Debes seleccionar un archivo"

      });

    }

    const uploadedDocument =
      await uploadBufferToCloudinary(
        req.file,
        "respaldos"
      );

    await runQuery(

      `
      UPDATE asesores

      SET

        documento_respaldo_url = $1,
        tipo_documento = $2

      WHERE id_usuario = $3
      `,

      [

        uploadedDocument.url,

        req.body.tipo_documento ||
          "documento_respaldo",

        id_usuario

      ]

    );

    await runQuery(

      `
      UPDATE usuarios

      SET

        estado_validacion = 'pendiente',

        badge_verificacion =
          'Reenviado para revisión',

        motivo_rechazo = NULL,

        documento_reenviado = TRUE,

        fecha_reenvio_documento =
          CURRENT_TIMESTAMP

      WHERE id_usuario = $1
      `,

      [id_usuario]

    );

    return res.json({

      ok: true,

      message:
        "Documento reenviado correctamente"

    });

  } catch (error) {

    console.error(
      "Error resubmitAsesorDocument:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al reenviar documento",

      error:
        error.message

    });

  }

};
