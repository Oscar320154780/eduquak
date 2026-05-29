// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const jwt = require("jsonwebtoken");
const db = require("../db");

// Ejecuta una consulta SQL cuando solo esperamos un registro de respuesta.
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Verifica que la petición venga con un token válido antes de dejar pasar al usuario.
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
      `SELECT id_usuario, correo, rol, estado_validacion, badge_verificacion
       FROM usuarios
       WHERE id_usuario = ?`,
      [decoded.id_usuario]
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    req.user = user;
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
