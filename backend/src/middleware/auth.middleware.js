const jwt = require("jsonwebtoken");
const db = require("../db");

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        message: "Token no proporcionado"
      });
    }

    const parts = authHeader.split(" " );

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        ok: false,
        message: "Formato de token inválido"
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await getQuery(
      `SELECT
         u.id_usuario,
         u.correo,
         u.rol,
         u.estado_validacion,
         u.badge_verificacion,
         sancion.id_sancion AS sancion_id,
         sancion.motivo AS sancion_motivo,
         sancion.fecha_fin AS sancion_hasta
       FROM usuarios u
       LEFT JOIN LATERAL (
         SELECT id_sancion, motivo, fecha_fin
         FROM sanciones_usuario
         WHERE id_usuario = u.id_usuario
           AND estado = 'activa'
           AND fecha_fin > (NOW() AT TIME ZONE 'America/Mexico_City')
         ORDER BY fecha_fin DESC
         LIMIT 1
       ) sancion ON TRUE
       WHERE u.id_usuario = ?`,
      [decoded.id_usuario]
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    req.user = {
      ...user,
      sancionado: Boolean(user.sancion_id)
    };
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado"
    });
  }
}

module.exports = {
  requireAuth
};
