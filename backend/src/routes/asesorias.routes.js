// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo. 
const express = require("express");
const router = express.Router();

const controller = require("../controllers/asesorias.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const {
  requireVerified,
  requireVerifiedAlumno
} = require("../middleware/verified.middleware");

const uploadReportes = require("../middleware/uploadReportes");

/* =========================
   ALUMNO
========================= */

// solicitar asesoría individual
router.post(
  "/",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.crearAsesoria
);

// ver mis asesorías
router.get(
  "/mis",
  requireAuth,
  requireRole("alumno"),
  controller.obtenerMisAsesorias
);

// ver asesorías grupales disponibles
router.get(
  "/grupales",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerAsesoriasGrupales
);

// ver inscritos de una grupal
router.get(
  "/grupales/:id/inscritos",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerInscritosGrupalAlumno
);

// inscribirse a una grupal
router.post(
  "/grupales/:id/inscribirse",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.inscribirseAGrupal
);

// salirse de una grupal
router.delete(
  "/grupales/:id/salirse",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.salirseDeGrupal
);

// ver asesorías finalizadas para calificar
router.get(
  "/finalizadas",
  requireAuth,
  requireRole("alumno"),
  controller.obtenerFinalizadas
);

// calificar asesoría finalizada
router.post(
  "/:id/calificar",
  requireAuth,
  requireRole("alumno"),
  controller.calificarAsesor
);

// reportar asesoría finalizada
router.post(
  "/:id/reportar",
  requireAuth,
  requireRole("alumno"),
  uploadReportes.single("evidencia"),
  controller.reportarAsesoria
);

/* =========================
   ASESOR
========================= */

// ver solicitudes / asesorías
router.get(
  "/",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerSolicitudes
);

// ver mis grupales
router.get(
  "/asesor/grupales",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisGrupalesAsesor
);

// ver inscritos de una grupal propia
router.get(
  "/asesor/grupales/:id/inscritos",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerInscritosDeGrupal
);

// responder asesoría (aceptar, rechazar, finalizar)
router.put(
  "/:id",
  requireAuth,
  requireRole("asesor"),
  controller.responderAsesoria
);

// crear asesoría grupal
router.post(
  "/grupal",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.crearAsesoriaGrupal
);

module.exports = router;