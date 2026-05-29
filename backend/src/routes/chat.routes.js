const express = require("express");
const router = express.Router();

const controller = require("../controllers/chat.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get(
  "/:idAsesoria",
  requireAuth,
  controller.obtenerMensajes
);

router.post(
  "/:idAsesoria",
  requireAuth,
  controller.enviarMensaje
);

module.exports = router;
