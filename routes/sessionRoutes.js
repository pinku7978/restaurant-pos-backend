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

// Customer or Owner testing
router.post("/", protect, allowRoles("customer", "owner"), createSession);
router.post("/:sessionId/join", protect, allowRoles("customer", "owner"), joinSession);
router.get("/table/:tableId", getActiveSessionsForTable); // public - shown right after a QR scan, before login
router.post("/:sessionId/request-bill", protect, allowRoles("customer", "owner"), requestBill);

// Cashier or Owner oversight
router.get("/restaurant/active", protect, allowRoles("cashier", "owner"), getActiveSessionsForRestaurant);

module.exports = router;
