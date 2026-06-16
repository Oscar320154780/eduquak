const express = require("express");
const router = express.Router();

const controller = require("../controllers/mercadopago.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.get("/estado", requireAuth, requireRole("asesor"), controller.obtenerEstado);
router.get("/conectar-url", requireAuth, requireRole("asesor"), controller.obtenerUrlConexion);
router.get("/callback", controller.callback);
router.post("/desconectar", requireAuth, requireRole("asesor"), controller.desconectar);

module.exports = router;
