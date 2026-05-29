// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const controller = require("../controllers/resenas.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

// alumno crea reseña de una asesoría finalizada
router.post(
  "/asesoria/:id",
  requireAuth,
  requireRole("alumno"),
  controller.crearResena
);

// asesor ve SUS propias reseñas
router.get(
  "/mis",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisResenas
);

// ver reseñas de un asesor
router.get(
  "/asesor/:id_asesor",
  requireAuth,
  controller.obtenerResenasDeAsesor
);

module.exports = router;