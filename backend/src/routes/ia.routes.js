const express = require("express");
const router = express.Router();

const { explicarError } = require("../controllers/ia.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireVerifiedAlumno } = require("../middleware/verified.middleware");

router.post(
  "/explicar-error",
  requireAuth,
  requireVerifiedAlumno,
  explicarError
);

module.exports = router;
