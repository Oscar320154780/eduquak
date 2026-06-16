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

router.post(
  "/upload",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  uploadMaterial.single("archivo"),
  controller.subirMaterial
);

router.get(
  "/mis",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisMateriales
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("asesor"),
  controller.eliminarMaterial
);

router.get(
  "/publicos",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerMaterialesAprobados
);

router.get(
  "/admin/todos",
  requireAuth,
  requireRole("admin"),
  controller.obtenerTodosLosMateriales
);

router.put(
  "/admin/:id/approve",
  requireAuth,
  requireRole("admin"),
  controller.aprobarMaterial
);

router.put(
  "/admin/:id/reject",
  requireAuth,
  requireRole("admin"),
  controller.rechazarMaterial
);

module.exports = router;
