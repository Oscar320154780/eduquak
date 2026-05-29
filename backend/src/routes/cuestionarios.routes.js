// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const controller = require("../controllers/cuestionarios.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const {
  requireVerified,
  requireVerifiedAlumno
} = require("../middleware/verified.middleware");

// ASESOR
router.post(
  "/",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.crearCuestionario
);

router.post(
  "/crear-completo",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.crearCuestionarioCompleto
);

router.post(
  "/:id/preguntas",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.agregarPregunta
);

router.get(
  "/mis",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisCuestionarios
);

// asesor elimina su cuestionario
router.delete(
  "/:id",
  requireAuth,
  requireRole("asesor"),
  controller.eliminarCuestionario
);

// ALUMNO
router.get(
  "/publicos",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerCuestionariosAprobados
);

router.get(
  "/:id/preguntas",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerPreguntasCuestionario
);

router.post(
  "/:id/responder",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.responderCuestionario
);

// ADMIN
router.get(
  "/admin/todos",
  requireAuth,
  requireRole("admin"),
  controller.obtenerTodosLosCuestionarios
);

router.get(
  "/admin/:id/preguntas",
  requireAuth,
  requireRole("admin"),
  controller.obtenerPreguntasCuestionarioAdmin
);

router.put(
  "/admin/:id/approve",
  requireAuth,
  requireRole("admin"),
  controller.aprobarCuestionario
);

router.put(
  "/admin/:id/reject",
  requireAuth,
  requireRole("admin"),
  controller.rechazarCuestionario
);

module.exports = router;