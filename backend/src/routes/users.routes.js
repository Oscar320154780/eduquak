// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const usersController = require("../controllers/users.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { uploadConstancia, uploadRespaldo } = require("../config/multer");

// perfil del usuario autenticado
router.get("/me", requireAuth, usersController.getMe);
router.put("/me", requireAuth, usersController.updateMe);
router.put("/me/password", requireAuth, usersController.updateMyPassword);


router.put(
  "/me/documento/alumno",
  requireAuth,
  requireRole("alumno"),
  uploadConstancia.single("documento"),
  usersController.resubmitAlumnoDocument
);

router.put(
  "/me/documento/asesor",
  requireAuth,
  requireRole("asesor"),
  uploadRespaldo.single("documento"),
  usersController.resubmitAsesorDocument
);

// asesores públicos para alumnos y vista comparativa de asesores
router.get(
  "/asesores",
  requireAuth,
  requireRole("alumno", "asesor", "admin"),
  usersController.getAsesoresPublicos
);

module.exports = router;