const express = require("express");
const router = express.Router();

const controller = require("../controllers/asesorias.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const {
  requireVerified,
  requireVerifiedAlumno,
  requireNotSanctioned
} = require("../middleware/verified.middleware");

const uploadReportes = require("../middleware/uploadReportes");


router.post(
  "/",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.crearAsesoria
);

router.get(
  "/mis",
  requireAuth,
  requireRole("alumno"),
  controller.obtenerMisAsesorias
);

router.get(
  "/grupales",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerAsesoriasGrupales
);

router.get(
  "/grupales/:id/inscritos",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.obtenerInscritosGrupalAlumno
);

router.post(
  "/grupales/:id/inscribirse",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.inscribirseAGrupal
);

router.delete(
  "/grupales/:id/salirse",
  requireAuth,
  requireRole("alumno"),
  requireVerifiedAlumno,
  controller.salirseDeGrupal
);

router.get(
  "/finalizadas",
  requireAuth,
  requireRole("alumno"),
  controller.obtenerFinalizadas
);

router.post(
  "/:id/calificar",
  requireAuth,
  requireRole("alumno"),
  requireNotSanctioned,
  controller.calificarAsesor
);


router.get(
  "/:id/reporte",
  requireAuth,
  requireRole("alumno"),
  controller.obtenerReporteDeAsesoria
);

router.post(
  "/:id/reportar",
  requireAuth,
  requireRole("alumno"),
  requireNotSanctioned,
  uploadReportes.single("evidencia"),
  controller.reportarAsesoria
);


router.get(
  "/:id/video-access",
  requireAuth,
  controller.validarAccesoVideollamada
);


router.get(
  "/",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerSolicitudes
);

router.get(
  "/asesor/grupales",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerMisGrupalesAsesor
);

router.get(
  "/asesor/grupales/:id/inscritos",
  requireAuth,
  requireRole("asesor"),
  controller.obtenerInscritosDeGrupal
);

router.put(
  "/:id",
  requireAuth,
  requireRole("asesor"),
  requireNotSanctioned,
  controller.responderAsesoria
);

router.put(
  "/:id/reagendar",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.reagendarAsesoria
);

router.post(
  "/grupal",
  requireAuth,
  requireRole("asesor"),
  requireVerified,
  controller.crearAsesoriaGrupal
);

module.exports = router;
