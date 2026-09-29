const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  createSession,
  joinSession,
  getActiveSessionsForTable,
  getActiveSessionsForRestaurant,
  requestBill
} = require("../controllers/sessionController");

// Customer-facing
router.post("/", protect, allowRoles("customer"), createSession);
router.post("/:sessionId/join", protect, allowRoles("customer"), joinSession);
router.get("/table/:tableId", getActiveSessionsForTable); // public — shown right after a QR scan, before login
router.post("/:sessionId/request-bill", protect, allowRoles("customer"), requestBill);

// Cashier-facing
router.get("/restaurant/active", protect, allowRoles("cashier", "owner"), getActiveSessionsForRestaurant);

module.exports = router;
