const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVerified } = require("../middleware/verified.middleware");

router.get(
  "/solo-alumno-verificado",
  requireAuth,
  requireRole("alumno"),
  requireVerified,
  (req, res) => {
    res.json({
      ok: true,
      message: "Bienvenido. Esta función está disponible para alumnos verificados."
    });
  }
);

router.get(
  "/solo-asesor-verificado",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  (req, res) => {
    res.json({
      ok: true,
      message: "Bienvenido. Esta función está disponible para asesores verificados."
    });
  }
);

router.get(
  "/solo-admin",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json({
      ok: true,
      message: "Bienvenido administrador."
    });
  }
);

module.exports = router;
