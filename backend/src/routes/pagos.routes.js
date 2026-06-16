const express = require("express");
const router = express.Router();

const controller = require("../controllers/pagos.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.post("/crear-preferencia-prueba", requireAuth, controller.crearPreferenciaPrueba);
router.post("/asesoria/:id/preferencia", requireAuth, requireRole("alumno"), controller.crearPreferenciaAsesoria);
router.post("/registrar-retorno", requireAuth, requireRole("alumno"), controller.registrarRetorno);
router.get("/mis-pagos", requireAuth, requireRole("alumno"), controller.obtenerMisPagos);
router.get("/admin/resumen", requireAuth, requireRole("admin"), controller.obtenerResumenAdmin);
router.post("/webhook", controller.webhook);
router.get("/webhook", controller.webhook);

module.exports = router;
