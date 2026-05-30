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

// Ejecuta una consulta SQL cuando necesitamos una lista completa de registros.
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
// Ejecuta una consulta SQL cuando solo esperamos un registro de respuesta.
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Controla la lógica de generar sala jitsi: recibe la petición, habla con la base de datos y responde al frontend.

function normalizarPaginacion(req, limiteDefault = 12, limiteMaximo = 50) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitSolicitado = parseInt(req.query.limit, 10) || limiteDefault;
  const limit = Math.min(Math.max(limitSolicitado, 1), limiteMaximo);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function generarSalaJitsi(idAsesoria) {
  const room_name = `eduquak-asesoria-${idAsesoria}`;
  const video_url = `https://meet.jit.si/${room_name}`;
  return { room_name, video_url };
}


function parseFechaHoraAsesoria(fecha, hora) {
  if (!fecha || !hora) return null;

  const fechaTxt = String(fecha).trim();
  const horaTxt = String(hora).trim();

  let year;
  let month;
  let day;

  const iso = fechaTxt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const mx = fechaTxt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (mx) {
    day = Number(mx[1]);
    month = Number(mx[2]);
    year = Number(mx[3]);
  } else {
    return null;
  }

  const horaMatch = horaTxt.match(/^(\d{1,2}):(\d{2})/);

  if (!horaMatch) return null;

  const hour = Number(horaMatch[1]);
  const minute = Number(horaMatch[2]);

  if (
    !year || !month || !day ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    return null;
  }

  return Date.UTC(year, month - 1, day, hour, minute, 0);
}

function ahoraMexicoMs() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const mapa = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  );

  return Date.UTC(
    Number(mapa.year),
    Number(mapa.month) - 1,
    Number(mapa.day),
    Number(mapa.hour),
    Number(mapa.minute),
    Number(mapa.second)
  );
}

async function obtenerAsesoriaVideoAutorizada(idAsesoria, usuario) {
  const asesoria = await getQuery(
    `SELECT
        id_asesoria,
        id_alumno,
        id_asesor,
        estado,
        tipo,
        fecha,
        hora,
        room_name,
        video_url
     FROM asesorias
     WHERE id_asesoria = ?`,
    [idAsesoria]
  );

  if (!asesoria) {
    return {
      ok: false,
      status: 404,
      message: "La asesoría no existe"
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
      message: "No tienes acceso a esta videollamada"
    };
  }

  if (asesoria.estado !== "aceptada") {
    return {
      ok: false,
      status: 403,
      message: "La videollamada solo está disponible para asesorías aceptadas"
    };
  }

  if (!asesoria.room_name || !asesoria.fecha || !asesoria.hora) {
    return {
      ok: false,
      status: 400,
      message: "La asesoría no tiene sala, fecha u hora configurada"
    };
  }

  const inicioMs = parseFechaHoraAsesoria(asesoria.fecha, asesoria.hora);

  if (!inicioMs) {
    return {
      ok: false,
      status: 400,
      message: "La fecha u hora de la asesoría no es válida"
    };
  }

  const ahoraMs = ahoraMexicoMs();
  const aperturaMs = inicioMs - (10 * 60 * 1000);

  if (ahoraMs < aperturaMs) {
    return {
      ok: false,
      status: 403,
      message: "La videollamada estará disponible 10 minutos antes de la hora agendada.",
      disponible_desde: new Date(aperturaMs).toISOString(),
      fecha: asesoria.fecha,
      hora: asesoria.hora
    };
  }

  return {
    ok: true,
    asesoria
  };
}


exports.validarAccesoVideollamada = async (req, res) => {
  try {
    const permiso = await obtenerAsesoriaVideoAutorizada(
      req.params.id,
      req.user
    );

    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false,
        message: permiso.message,
        disponible_desde: permiso.disponible_desde || null,
        fecha: permiso.fecha || null,
        hora: permiso.hora || null
      });
    }

    return res.json({
      ok: true,
      message: "Videollamada disponible",
      asesoria: permiso.asesoria,
      room_name: permiso.asesoria.room_name,
      video_url: permiso.asesoria.video_url
    });
  } catch (error) {
    console.error("Error al validar acceso a videollamada:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al validar la videollamada"
    });
  }
};

// alumno solicita asesoría individual
exports.crearAsesoria = async (req, res) => {
  try {
    const { id_asesor, mensaje } = req.body;
    const id_alumno = req.user.id_usuario;

    if (!id_asesor) {
      return res.status(400).json({
        ok: false,
        message: "Debes indicar el ID del asesor"
      });
    }

    const asesor = await getQuery(
      `SELECT id_usuario, rol
       FROM usuarios
       WHERE id_usuario = ?`,
      [id_asesor]
    );

    if (!asesor) {
      return res.status(404).json({
        ok: false,
        message: "El asesor no existe"
      });
    }

    if (asesor.rol !== "asesor") {
      return res.status(400).json({
        ok: false,
        message: "El ID proporcionado no corresponde a un asesor"
      });
    }

    const result = await runQuery(
      `INSERT INTO asesorias (id_alumno, id_asesor, mensaje, tipo, cupo_maximo)
       VALUES (?, ?, ?, 'individual', 1)`,
      [id_alumno, id_asesor, mensaje || null]
    );

    return res.status(201).json({
      ok: true,
      message: "Solicitud de asesoría enviada",
      id_asesoria: result.lastID
    });
  } catch (error) {
    console.error("Error al crear asesoría:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al crear asesoría"
    });
  }
};

// asesor crea asesoría grupal
exports.crearAsesoriaGrupal = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;
    const { fecha, hora, mensaje, cupo_maximo } = req.body;

    if (!fecha || !hora || !cupo_maximo) {
      return res.status(400).json({
        ok: false,
        message: "Fecha, hora y cupo máximo son obligatorios"
      });
    }

    const result = await runQuery(
      `INSERT INTO asesorias (
        id_alumno,
        id_asesor,
        estado,
        fecha,
        hora,
        tipo,
        mensaje,
        cupo_maximo
      ) VALUES (?, ?, 'aceptada', ?, ?, 'grupal', ?, ?)`,
      [null, id_asesor, fecha, hora, mensaje || null, Number(cupo_maximo)]
    );

    const id_asesoria = result.lastID;
    const { room_name, video_url } = generarSalaJitsi(id_asesoria);

    await runQuery(
      `UPDATE asesorias
       SET room_name = ?, video_url = ?
       WHERE id_asesoria = ?`,
      [room_name, video_url, id_asesoria]
    );

    return res.status(201).json({
      ok: true,
      message: "Asesoría grupal creada correctamente",
      asesoria: {
        id_asesoria,
        room_name,
        video_url
      }
    });
  } catch (error) {
    console.error("Error al crear asesoría grupal:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al crear asesoría grupal"
    });
  }
};

// alumno ve sus asesorías
exports.obtenerMisAsesorias = async (req, res) => {

  try {

    const id_alumno = req.user.id_usuario;

    // individuales
    const asesoriasIndividuales = await allQuery(
      `SELECT 
          a.id_asesoria,
          a.estado,
          a.fecha,
          a.hora,
          a.tipo,
          a.mensaje,
          a.cupo_maximo,
          a.room_name,
          a.video_url,
          a.fecha_creacion,

          u.nombre AS nombre_asesor,
          u.correo AS correo_asesor,

          EXISTS (
            SELECT 1
            FROM reportes_asesoria r
            WHERE r.id_asesoria = a.id_asesoria
              AND r.id_alumno = ?
          ) AS reporte_enviado

       FROM asesorias a

       JOIN usuarios u
         ON a.id_asesor = u.id_usuario

       WHERE a.id_alumno = ?

       ORDER BY a.fecha_creacion DESC`,
      [id_alumno, id_alumno]
    );

    // grupales inscritas
    const asesoriasGrupales = await allQuery(
      `SELECT
          a.id_asesoria,
          a.estado,
          a.fecha,
          a.hora,
          a.tipo,
          a.mensaje,
          a.cupo_maximo,
          a.room_name,
          a.video_url,
          a.fecha_creacion,

          u.nombre AS nombre_asesor,
          u.correo AS correo_asesor,

          EXISTS (
            SELECT 1
            FROM reportes_asesoria r
            WHERE r.id_asesoria = a.id_asesoria
              AND r.id_alumno = ?
          ) AS reporte_enviado

       FROM inscripciones_asesoria i

       JOIN asesorias a
         ON i.id_asesoria = a.id_asesoria

       JOIN usuarios u
         ON a.id_asesor = u.id_usuario

       WHERE i.id_alumno = ?
         AND i.estado = 'inscrito'

       ORDER BY a.fecha_creacion DESC`,
      [id_alumno, id_alumno]
    );

    return res.json({
      ok: true,
      asesorias: [
        ...asesoriasIndividuales,
        ...asesoriasGrupales
      ]
    });

  } catch (error) {

    console.error(
      "Error al obtener mis asesorías:",
      error
    );

    return res.status(500).json({
      ok: false,
      message: "Error al obtener tus asesorías"
    });

  }
};
// asesor ve solicitudes
exports.obtenerSolicitudes = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const solicitudes = await allQuery(
      `SELECT 
          a.id_asesoria,
          a.estado,
          a.fecha,
          a.hora,
          a.tipo,
          a.mensaje,
          a.cupo_maximo,
          a.room_name,
          a.video_url,
          a.fecha_creacion,
          u.nombre AS nombre_alumno,
          u.correo AS correo_alumno
       FROM asesorias a
       LEFT JOIN usuarios u ON a.id_alumno = u.id_usuario
       WHERE a.id_asesor = ?
       ORDER BY a.fecha_creacion DESC`,
      [id_asesor]
    );

    return res.json({
      ok: true,
      solicitudes
    });
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener solicitudes"
    });
  }
};

exports.responderAsesoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha, hora } = req.body;
    const id_asesor = req.user.id_usuario;

    if (!estado || !["aceptada", "rechazada", "finalizada"].includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: "El estado debe ser 'aceptada', 'rechazada' o 'finalizada'"
      });
    }

    const asesoria = await getQuery(
      `SELECT id_asesoria, id_asesor, estado, tipo
       FROM asesorias
       WHERE id_asesoria = ?`,
      [id]
    );

    if (!asesoria) {
      return res.status(404).json({
        ok: false,
        message: "La asesoría no existe"
      });
    }

    if (asesoria.id_asesor !== id_asesor) {
      return res.status(403).json({
        ok: false,
        message: "No puedes responder una asesoría que no te pertenece"
      });
    }

    if (estado === "aceptada") {
      if (!fecha || !hora) {
        return res.status(400).json({
          ok: false,
          message: "Debes indicar fecha y hora para aceptar la asesoría"
        });
      }

      const { room_name, video_url } = generarSalaJitsi(id);

      await runQuery(
        `UPDATE asesorias
         SET estado = ?, fecha = ?, hora = ?, room_name = ?, video_url = ?
         WHERE id_asesoria = ?`,
        [estado, fecha, hora, room_name, video_url, id]
      );
    } else if (estado === "rechazada") {
      await runQuery(
        `UPDATE asesorias
         SET estado = ?, fecha = NULL, hora = NULL, room_name = NULL, video_url = NULL
         WHERE id_asesoria = ?`,
        [estado, id]
      );
    } else if (estado === "finalizada") {
      await runQuery(
        `UPDATE asesorias
         SET estado = ?
         WHERE id_asesoria = ?`,
        [estado, id]
      );
    }

    return res.json({
      ok: true,
      message: "Asesoría actualizada correctamente"
    });
  } catch (error) {
    console.error("Error al responder asesoría:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al responder asesoría"
    });
  }
};

// alumno ve grupales disponibles
exports.obtenerAsesoriasGrupales = async (req, res) => {
  try {
    const id_alumno = req.user.id_usuario;
    const { page, limit, offset } = normalizarPaginacion(req, 12, 50);
    const busqueda = normalizarTexto(req.query.q);

    const where = [
      "a.tipo = 'grupal'",
      "a.estado = 'aceptada'"
    ];
    const whereParams = [];

    if (busqueda) {
      const like = `%${busqueda}%`;
      where.push(`(
        u.nombre ILIKE ?
        OR COALESCE(a.mensaje, '') ILIKE ?
        OR COALESCE(a.fecha, '') ILIKE ?
        OR COALESCE(a.hora, '') ILIKE ?
      )`);
      whereParams.push(like, like, like, like);
    }

    const whereSql = where.join(" AND ");

    const totalRow = await getQuery(
      `SELECT COUNT(*) AS total
       FROM asesorias a
       JOIN usuarios u ON a.id_asesor = u.id_usuario
       WHERE ${whereSql}`,
      whereParams
    );

    const grupales = await allQuery(
      `SELECT
          a.id_asesoria,
          a.fecha,
          a.hora,
          a.mensaje,
          a.cupo_maximo,
          a.room_name,
          a.video_url,
          a.estado,
          u.nombre AS nombre_asesor,
          (
            SELECT COUNT(*)
            FROM inscripciones_asesoria i
            WHERE i.id_asesoria = a.id_asesoria
              AND i.estado = 'inscrito'
          ) AS inscritos,
          (
            SELECT COUNT(*)
            FROM inscripciones_asesoria i2
            WHERE i2.id_asesoria = a.id_asesoria
              AND i2.id_alumno = ?
              AND i2.estado = 'inscrito'
          ) AS ya_inscrito
       FROM asesorias a
       JOIN usuarios u ON a.id_asesor = u.id_usuario
       WHERE ${whereSql}
       ORDER BY a.fecha, a.hora
       LIMIT ? OFFSET ?`,
      [id_alumno, ...whereParams, limit, offset]
    );

    const asesorias = grupales.map((g) => {
      const inscritos = Number(g.inscritos || 0);
      const cupo_maximo = Number(g.cupo_maximo || 0);

      return {
        ...g,
        inscritos,
        cupo_maximo,
        disponibles: Math.max(cupo_maximo - inscritos, 0),
        ya_inscrito: Number(g.ya_inscrito || 0) > 0
      };
    });

    const total = Number(totalRow?.total || 0);

    return res.json({
      ok: true,
      asesorias,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Error al obtener asesorías grupales:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener asesorías grupales"
    });
  }
};

exports.inscribirseAGrupal = async (req, res) => {

  try {

    const { id } = req.params;
    const id_alumno = req.user.id_usuario;

    const asesoria = await getQuery(
      `SELECT id_asesoria, tipo, estado, cupo_maximo
       FROM asesorias
       WHERE id_asesoria = ?`,
      [id]
    );

    if (!asesoria) {
      return res.status(404).json({
        ok: false,
        message: "Asesoría grupal no encontrada"
      });
    }

    if (asesoria.tipo !== "grupal") {
      return res.status(400).json({
        ok: false,
        message: "Esta asesoría no es grupal"
      });
    }

    if (asesoria.estado !== "aceptada") {
      return res.status(400).json({
        ok: false,
        message: "La asesoría no está disponible"
      });
    }

    const existente = await getQuery(
      `SELECT id_inscripcion, estado
       FROM inscripciones_asesoria
       WHERE id_asesoria = ?
         AND id_alumno = ?
       ORDER BY id_inscripcion DESC
       LIMIT 1`,
      [id, id_alumno]
    );

    if (existente && existente.estado === "inscrito") {
      return res.status(409).json({
        ok: false,
        message: "Ya estás inscrito en esta asesoría"
      });
    }

    const cupos = await getQuery(
      `SELECT COUNT(*) AS inscritos
       FROM inscripciones_asesoria
       WHERE id_asesoria = ?
         AND estado = 'inscrito'`,
      [id]
    );

    if (Number(cupos.inscritos) >= Number(asesoria.cupo_maximo)) {
      return res.status(400).json({
        ok: false,
        message: "Ya no hay lugares disponibles"
      });
    }

    if (existente && existente.estado === "cancelado") {

      await runQuery(
        `UPDATE inscripciones_asesoria
         SET estado = 'inscrito',
             fecha_inscripcion = CURRENT_TIMESTAMP
         WHERE id_inscripcion = ?`,
        [existente.id_inscripcion]
      );

    } else {

      await runQuery(
        `INSERT INTO inscripciones_asesoria
         (id_asesoria, id_alumno, estado)
         VALUES (?, ?, 'inscrito')`,
        [id, id_alumno]
      );

    }

    return res.json({
      ok: true,
      message: "Te inscribiste correctamente a la asesoría grupal"
    });

  } catch (error) {

    console.error("Error al inscribirse a grupal:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al inscribirse a la asesoría grupal"
    });

  }
};

// alumno se sale de una grupal
exports.salirseDeGrupal = async (req, res) => {

  try {

    const { id } = req.params;
    const id_alumno = req.user.id_usuario;

    // verificar asesoría
    const asesoria = await getQuery(
      `SELECT id_asesoria, tipo, estado
       FROM asesorias
       WHERE id_asesoria = ?`,
      [id]
    );

    if (!asesoria) {
      return res.status(404).json({
        ok: false,
        message: "La asesoría no existe"
      });
    }

    if (asesoria.tipo !== "grupal") {
      return res.status(400).json({
        ok: false,
        message: "Esta asesoría no es grupal"
      });
    }

    // verificar inscripción activa
    const inscripcion = await getQuery(
      `SELECT id_inscripcion
       FROM inscripciones_asesoria
       WHERE id_asesoria = ?
         AND id_alumno = ?
         AND estado = 'inscrito'`,
      [id, id_alumno]
    );

    if (!inscripcion) {
      return res.status(400).json({
        ok: false,
        message: "No estás inscrito en esta asesoría"
      });
    }

    // cancelar inscripción
    await runQuery(
      `UPDATE inscripciones_asesoria
       SET estado = 'cancelado'
       WHERE id_inscripcion = ?`,
      [inscripcion.id_inscripcion]
    );

    return res.json({
      ok: true,
      message: "Saliste correctamente de la asesoría grupal"
    });

  } catch (error) {

    console.error("Error al salir de grupal:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al salir de la asesoría grupal"
    });

  }
};
// Controla la lógica de obtener mis grupales asesor: recibe la petición, habla con la base de datos y responde al frontend.
exports.obtenerMisGrupalesAsesor = async (req, res) => {
  try {
    const id_asesor = req.user.id_usuario;

    const grupales = await allQuery(
      `SELECT
          a.id_asesoria,
          a.estado,
          a.fecha,
          a.hora,
          a.tipo,
          a.mensaje,
          a.cupo_maximo,
          a.room_name,
          a.video_url,
          a.fecha_creacion,
          (
            SELECT COUNT(*)
            FROM inscripciones_asesoria i
            WHERE i.id_asesoria = a.id_asesoria
              AND i.estado = 'inscrito'
          ) AS inscritos
       FROM asesorias a
       WHERE a.id_asesor = ?
         AND a.tipo = 'grupal'
       ORDER BY a.fecha_creacion DESC`,
      [id_asesor]
    );

    const asesorias = grupales.map((g) => {
      const inscritos = Number(g.inscritos || 0);
      const cupo_maximo = Number(g.cupo_maximo || 0);

      return {
        ...g,
        inscritos,
        disponibles: Math.max(cupo_maximo - inscritos, 0)
      };
    });

    return res.json({
      ok: true,
      asesorias
    });
  } catch (error) {
    console.error("Error al obtener grupales del asesor:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener asesorías grupales del asesor"
    });
  }
};
// Controla la lógica de obtener inscritos de grupal: recibe la petición, habla con la base de datos y responde al frontend.
exports.obtenerInscritosDeGrupal = async (req, res) => {
  try {
    const { id } = req.params;
    const id_asesor = req.user.id_usuario;

    const asesoria = await getQuery(
      `SELECT id_asesoria, id_asesor, tipo
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

    if (asesoria.id_asesor !== id_asesor) {
      return res.status(403).json({
        ok: false,
        message: "No puedes ver inscritos de una asesoría que no te pertenece"
      });
    }

    if (asesoria.tipo !== "grupal") {
      return res.status(400).json({
        ok: false,
        message: "Esta asesoría no es grupal"
      });
    }

    const inscritos = await allQuery(
      `SELECT
          i.id_inscripcion,
          i.fecha_inscripcion,
          u.id_usuario,
          u.nombre,
          u.correo
       FROM inscripciones_asesoria i
       JOIN usuarios u ON i.id_alumno = u.id_usuario
       WHERE i.id_asesoria = ?
         AND i.estado = 'inscrito'
       ORDER BY i.fecha_inscripcion ASC`,
      [id]
    );

    return res.json({
      ok: true,
      inscritos
    });
  } catch (error) {
    console.error("Error al obtener inscritos de grupal:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener inscritos"
    });
  }
};
// Controla la lógica de obtener inscritos grupal alumno: recibe la petición, habla con la base de datos y responde al frontend.
exports.obtenerInscritosGrupalAlumno = async (req, res) => {
  try {
    const { id } = req.params;

    const asesoria = await getQuery(
      `SELECT id_asesoria, tipo, estado
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

    if (asesoria.tipo !== "grupal") {
      return res.status(400).json({
        ok: false,
        message: "Esta asesoría no es grupal"
      });
    }

    if (asesoria.estado !== "aceptada") {
      return res.status(400).json({
        ok: false,
        message: "La asesoría no está disponible"
      });
    }

    const inscritos = await allQuery(
      `SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          i.fecha_inscripcion
       FROM inscripciones_asesoria i
       JOIN usuarios u ON i.id_alumno = u.id_usuario
       WHERE i.id_asesoria = ?
         AND i.estado = 'inscrito'
       ORDER BY i.fecha_inscripcion ASC`,
      [id]
    );

    return res.json({
      ok: true,
      inscritos
    });
  } catch (error) {
    console.error("Error al obtener inscritos para alumno:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener inscritos"
    });
  }
};
// alumno ve asesorías finalizadas, separadas entre pendientes y ya evaluadas
exports.obtenerFinalizadas = async (req, res) => {
  try {
    const id_alumno = req.user.id_usuario;

    const asesorias = await allQuery(
      `SELECT
          a.id_asesoria,
          a.fecha,
          a.hora,
          a.tipo,
          u.nombre AS nombre_asesor,
          u.correo AS correo_asesor,
          r.id_resena,
          r.calificacion,
          r.comentario,
          r.fecha AS fecha_resena
       FROM asesorias a
       JOIN usuarios u ON a.id_asesor = u.id_usuario
       LEFT JOIN resenas_asesor r ON r.id_asesoria = a.id_asesoria
       WHERE a.id_alumno = ?
         AND a.estado = 'finalizada'
       ORDER BY a.fecha DESC, a.hora DESC`,
      [id_alumno]
    );

    const pendientes = asesorias.filter((a) => !a.id_resena);
    const evaluadas = asesorias.filter((a) => a.id_resena);

    return res.json({
      ok: true,
      asesorias: pendientes,
      evaluadas,
      pendientes
    });
  } catch (error) {
    console.error("Error al obtener asesorías finalizadas:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener asesorías finalizadas"
    });
  }
};

exports.calificarAsesor = async (req, res) => {
  try {
    const { id } = req.params;
    const { estrellas, comentario } = req.body;
    const id_alumno = req.user.id_usuario;

    const calificacion = Number(estrellas);

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        ok: false,
        message: "La calificación debe estar entre 1 y 5"
      });
    }

    const asesoria = await getQuery(
      `SELECT
          id_asesoria,
          id_alumno,
          id_asesor,
          estado
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

    const yaExiste = await getQuery(
      `SELECT id_resena
       FROM resenas_asesor
       WHERE id_asesoria = ?`,
      [id]
    );

    if (yaExiste) {
      return res.status(409).json({
        ok: false,
        message: "Esta asesoría ya fue calificada"
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

    return res.json({
      ok: true,
      message: "Calificación enviada correctamente",
      resumen: {
        promedio: stats.promedio || 0,
        total_calificaciones: stats.total || 0
      }
    });
  } catch (error) {
    console.error("Error al calificar asesor:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al calificar asesoría"
    });
  }
};

exports.reportarAsesoria = async (req, res) => {

  try {

    const id_asesoria = req.params.id;

    const id_alumno =
      req.user.id_usuario;

    const {
      motivo,
      descripcion
    } = req.body;

    const uploadedEvidence = req.file
      ? await uploadBufferToCloudinary(req.file, "reportes")
      : null;

    const evidencia_url = uploadedEvidence
      ? uploadedEvidence.url
      : null;

    const tipo_evidencia = req.file
      ? req.file.mimetype
      : null;

    const asesoria = await getQuery(
      `
      SELECT id_asesor, id_alumno, estado
      FROM asesorias
      WHERE id_asesoria = $1
      `,
      [id_asesoria]
    );

    if (!asesoria) {

      return res.status(404).json({
        ok: false,
        msg: "Asesoría no encontrada"
      });

    }

    if (asesoria.id_alumno && Number(asesoria.id_alumno) !== Number(id_alumno)) {
      return res.status(403).json({
        ok: false,
        msg: "No puedes reportar una asesoría que no te pertenece"
      });
    }

    if (asesoria.estado !== "finalizada") {
      return res.status(400).json({
        ok: false,
        msg: "Solo puedes reportar asesorías finalizadas"
      });
    }

    const reporteExistente = await getQuery(
      `
      SELECT id_reporte
      FROM reportes_asesoria
      WHERE id_asesoria = $1
        AND id_alumno = $2
      LIMIT 1
      `,
      [id_asesoria, id_alumno]
    );

    if (reporteExistente) {
      return res.status(409).json({
        ok: false,
        msg: "Ya enviaste un reporte para esta asesoría"
      });
    }

    await runQuery(
      `
      INSERT INTO reportes_asesoria (

        id_asesoria,
        id_alumno,
        id_asesor,

        motivo,
        descripcion,

        evidencia_url,
        tipo_evidencia

      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        id_asesoria,
        id_alumno,
        asesoria.id_asesor,

        motivo,
        descripcion,

        evidencia_url,
        tipo_evidencia
      ]
    );

    return res.json({
      ok: true,
      msg: "Reporte enviado correctamente"
    });

  } catch (error) {

    console.error(
      "Error al reportar asesoría:",
      error
    );

    return res.status(500).json({
      ok: false,
      msg: "Error al guardar reporte"
    });

  }

};