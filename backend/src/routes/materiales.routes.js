// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const controller = require("../controllers/materiales.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const {
  requireVerified,
  requireVerifiedAlumno
} = require("../middleware/verified.middleware");
const { uploadMaterial } = require("../config/multer");

// asesor verificado sube material
router.post(
  "/upload",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  uploadMaterial.single("archivo"),
  controller.subirMaterial
);

// asesor ve sus materiales
router.get(
  "/mis",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisMateriales
);

// asesor elimina su material
router.delete(
  "/:id",
  requireAuth,
  requireRole("asesor"),
  controller.eliminarMaterial
);

// materiales aprobados
router.get(
  "/publicos",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerMaterialesAprobados
);

// admin ve todos los materiales
router.get(
  "/admin/todos",
  requireAuth,
  requireRole("admin"),
  controller.obtenerTodosLosMateriales
);

// admin aprueba material
router.put(
  "/admin/:id/approve",
  requireAuth,
  requireRole("admin"),
  controller.aprobarMaterial
);

// admin rechaza material
router.put(
  "/admin/:id/reject",
  requireAuth,
  requireRole("admin"),
  controller.rechazarMaterial
);

module.exports = router;