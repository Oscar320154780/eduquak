const express = require("express");
const router = express.Router();

const controller = require("../controllers/resenas.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.post(
  "/asesoria/:id",
  requireAuth,
  requireRole("alumno"),
  controller.crearResena
);

router.get(
  "/mis",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisResenas
);

router.get(
  "/asesor/:id_asesor",
  requireAuth,
  controller.obtenerResenasDeAsesor
);

module.exports = router;
