// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const controller = require("../controllers/stats.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.get(
  "/asesor",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerStatsAsesor
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  controller.obtenerStatsAdmin
);

router.get(
  "/top-asesores",
  requireAuth,
  requireRole("admin"),
  controller.obtenerTopAsesores
);

module.exports = router;