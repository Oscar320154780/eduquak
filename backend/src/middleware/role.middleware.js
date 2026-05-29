// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
// Revisa que el usuario tenga el rol correcto para entrar a una ruta.
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a esta ruta"
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};