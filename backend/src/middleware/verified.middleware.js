// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
// Bloquea acciones importantes si el asesor todavía no está verificado.
function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "Usuario no autenticado"
    });
  }

  if (req.user.estado_validacion !== "verificado") {
    return res.status(403).json({
      ok: false,
      message: "Tu cuenta aún no está verificada. Tu acceso es limitado."
    });
  }

  next();
}

// Bloquea acciones importantes si el alumno todavía no está verificado.
function requireVerifiedAlumno(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "Usuario no autenticado"
    });
  }

  if (req.user.rol !== "alumno") {
    return res.status(403).json({
      ok: false,
      message: "Esta función es solo para alumnos"
    });
  }

  if (req.user.estado_validacion !== "verificado") {
    return res.status(403).json({
      ok: false,
      message: "Tu cuenta debe estar verificada por un administrador para usar esta función."
    });
  }

  next();
}

module.exports = {
  requireVerified,
  requireVerifiedAlumno
};