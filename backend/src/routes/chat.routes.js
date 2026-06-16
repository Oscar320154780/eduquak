const express = require("express");
const router = express.Router();

const controller = require("../controllers/chat.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireNotSanctioned } = require("../middleware/verified.middleware");

router.get(
  "/unread/counts",
  requireAuth,
  controller.obtenerNoLeidos
);

router.get(
  "/:idAsesoria",
  requireAuth,
  controller.obtenerMensajes
);

router.post(
  "/:idAsesoria",
  requireAuth,
  requireNotSanctioned,
  controller.enviarMensaje
);

module.exports = router;
