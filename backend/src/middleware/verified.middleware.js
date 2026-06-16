function mensajeSancion(req) {
  const fecha = req.user?.sancion_hasta
    ? new Date(req.user.sancion_hasta).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "la fecha indicada";

  return `Tu cuenta está sancionada hasta ${fecha}. Motivo: ${req.user?.sancion_motivo || "Incumplimiento de normas"}.`;
}

function validarNoSancionado(req, res) {
  if (req.user?.rol !== "admin" && req.user?.sancionado) {
    res.status(403).json({
      ok: false,
      code: "USUARIO_SANCIONADO",
      message: mensajeSancion(req),
      sancion: {
        motivo: req.user.sancion_motivo,
        hasta: req.user.sancion_hasta
      }
    });
    return false;
  }

  return true;
}

function requireNotSanctioned(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "Usuario no autenticado"
    });
  }

  if (!validarNoSancionado(req, res)) return;

  next();
}

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

  if (!validarNoSancionado(req, res)) return;

  next();
}

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

  if (!validarNoSancionado(req, res)) return;

  next();
}

module.exports = {
  requireVerified,
  requireVerifiedAlumno,
  requireNotSanctioned,
  validarNoSancionado
};
