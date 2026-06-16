const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.get("/seed-admin", adminController.seedAdmin);

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  adminController.getPendingUsers
);

router.put(
  "/users/:id/approve",
  requireAuth,
  requireRole("admin"),
  adminController.approveUser
);

router.put(
  "/users/:id/reject",
  requireAuth,
  requireRole("admin"),
  adminController.rejectUser
);


router.get(
  "/reportes",
  requireAuth,
  requireRole("admin"),
  adminController.obtenerReportesAsesorias
);

router.put(
  "/reportes/:id",
  requireAuth,
  requireRole("admin"),
  adminController.actualizarEstadoReporte
);

router.post(
  "/reportes/:id/sancion",
  requireAuth,
  requireRole("admin"),
  adminController.aplicarSancionReporte
);

module.exports = router;
