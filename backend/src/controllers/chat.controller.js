const db = require("../db");

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

async function obtenerAsesoriaAutorizada(idAsesoria, usuario) {
  const asesoria = await getQuery(
    `SELECT
        a.id_asesoria,
        a.id_alumno,
        a.id_asesor,
        a.estado,
        a.tipo,
        a.fecha,
        a.hora,
        a.mensaje,
        alumno.nombre AS nombre_alumno,
        alumno.correo AS correo_alumno,
        asesor.nombre AS nombre_asesor,
        asesor.correo AS correo_asesor
     FROM asesorias a
     LEFT JOIN usuarios alumno
       ON a.id_alumno = alumno.id_usuario
     JOIN usuarios asesor
       ON a.id_asesor = asesor.id_usuario
     WHERE a.id_asesoria = ?`,
    [idAsesoria]
  );

  if (!asesoria) {
    return {
      ok: false,
      status: 404,
      message: "La asesoría no existe"
    };
  }

  if (asesoria.estado !== "aceptada") {
    return {
      ok: false,
      status: 403,
      message: "El chat solo está disponible cuando la asesoría está aceptada"
    };
  }

  const idUsuario = Number(usuario.id_usuario);
  const esAsesor = Number(asesoria.id_asesor) === idUsuario;
  const esAlumnoIndividual =
    asesoria.tipo === "individual" &&
    Number(asesoria.id_alumno) === idUsuario;

  let esAlumnoGrupal = false;

  if (asesoria.tipo === "grupal") {
    const inscripcion = await getQuery(
      `SELECT id_inscripcion
       FROM inscripciones_asesoria
       WHERE id_asesoria = ?
         AND id_alumno = ?
         AND estado = 'inscrito'
       LIMIT 1`,
      [idAsesoria, idUsuario]
    );

    esAlumnoGrupal = Boolean(inscripcion);
  }

  if (!esAsesor && !esAlumnoIndividual && !esAlumnoGrupal) {
    return {
      ok: false,
      status: 403,
      message: "No tienes acceso al chat de esta asesoría"
    };
  }

  const otroUsuario =
    esAsesor
      ? (
          asesoria.tipo === "grupal"
            ? {
                id_usuario: null,
                nombre: "Grupo de alumnos",
                correo: null,
                rol: "alumno"
              }
            : {
                id_usuario: asesoria.id_alumno,
                nombre: asesoria.nombre_alumno || "Alumno",
                correo: asesoria.correo_alumno || null,
                rol: "alumno"
              }
        )
      : {
          id_usuario: asesoria.id_asesor,
          nombre: asesoria.nombre_asesor || "Asesor",
          correo: asesoria.correo_asesor || null,
          rol: "asesor"
        };

  return {
    ok: true,
    asesoria: {
      ...asesoria,
      otro_usuario: otroUsuario
    }
  };
}

exports.obtenerMensajes = async (req, res) => {
  try {
    const { idAsesoria } = req.params;

    const permiso = await obtenerAsesoriaAutorizada(
      idAsesoria,
      req.user
    );

    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false,
        message: permiso.message
      });
    }

    const mensajes = await allQuery(
      `SELECT
          cm.id_mensaje,
          cm.id_asesoria,
          cm.id_emisor,
          cm.mensaje,
          cm.fecha_envio,
          u.nombre AS nombre_emisor,
          u.rol AS rol_emisor
       FROM chat_mensajes cm
       JOIN usuarios u
         ON cm.id_emisor = u.id_usuario
       WHERE cm.id_asesoria = ?
       ORDER BY cm.fecha_envio ASC,
                cm.id_mensaje ASC`,
      [idAsesoria]
    );

    return res.json({
      ok: true,
      asesoria: permiso.asesoria,
      mensajes: mensajes.map((mensaje) => ({
        ...mensaje,
        propio: Number(mensaje.id_emisor) === Number(req.user.id_usuario)
      }))
    });
  } catch (error) {
    console.error("Error al obtener mensajes:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener mensajes del chat"
    });
  }
};

exports.enviarMensaje = async (req, res) => {
  try {
    const { idAsesoria } = req.params;
    const mensaje = String(req.body.mensaje || "").trim();

    if (!mensaje) {
      return res.status(400).json({
        ok: false,
        message: "Escribe un mensaje antes de enviarlo"
      });
    }

    if (mensaje.length > 1000) {
      return res.status(400).json({
        ok: false,
        message: "El mensaje no puede superar 1000 caracteres"
      });
    }

    const permiso = await obtenerAsesoriaAutorizada(
      idAsesoria,
      req.user
    );

    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false,
        message: permiso.message
      });
    }

    const result = await runQuery(
      `INSERT INTO chat_mensajes
       (id_asesoria, id_emisor, mensaje)
       VALUES (?, ?, ?)`,
      [idAsesoria, req.user.id_usuario, mensaje]
    );

    const nuevoMensaje = await getQuery(
      `SELECT
          cm.id_mensaje,
          cm.id_asesoria,
          cm.id_emisor,
          cm.mensaje,
          cm.fecha_envio,
          u.nombre AS nombre_emisor,
          u.rol AS rol_emisor
       FROM chat_mensajes cm
       JOIN usuarios u
         ON cm.id_emisor = u.id_usuario
       WHERE cm.id_mensaje = ?`,
      [result.lastID]
    );

    return res.status(201).json({
      ok: true,
      message: "Mensaje enviado",
      mensaje: {
        ...nuevoMensaje,
        propio: true
      }
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al enviar mensaje"
    });
  }
};
