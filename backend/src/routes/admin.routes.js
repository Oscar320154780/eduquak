// Guía rápida: estos comentarios explican para qué sirve cada función sin cambiar la lógica del archivo.
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

// temporal para crear admin
router.get("/seed-admin", adminController.seedAdmin);

// ver usuarios
router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  adminController.getPendingUsers
);

// aprobar usuario
router.put(
  "/users/:id/approve",
  requireAuth,
  requireRole("admin"),
  adminController.approveUser
);

// rechazar usuario
router.put(
  "/users/:id/reject",
  requireAuth,
  requireRole("admin"),
  adminController.rejectUser
);

/* =========================
   REPORTES DE ASESORÍAS
========================= */

// ver reportes enviados por alumnos
router.get(
  "/reportes",
  requireAuth,
  requireRole("admin"),
  adminController.obtenerReportesAsesorias
);

// cambiar estado de un reporte
router.put(
  "/reportes/:id",
  requireAuth,
  requireRole("admin"),
  adminController.actualizarEstadoReporte
);

module.exports = router;