const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { uploadConstancia, uploadRespaldo } = require("../config/multer");

router.post(
  "/register/alumno",
  uploadConstancia.single("documento"),
  authController.registerAlumno
);

router.post(
  "/register/asesor",
  uploadRespaldo.single("documento"),
  authController.registerAsesor
);

router.post("/login", authController.login);

module.exports = router;
