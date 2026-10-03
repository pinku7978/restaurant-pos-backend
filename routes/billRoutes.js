const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  getBillBySession,
  getPendingBills,
  markBillPaid,
  createPaymentOrder,
  verifyPayment
} = require("../controllers/billController");

router.get("/session/:sessionId", protect, getBillBySession); // customer or cashier can view
router.get("/pending", protect, allowRoles("cashier", "owner"), getPendingBills);
router.patch("/:billId/pay", protect, allowRoles("cashier", "owner"), markBillPaid);
router.post("/:billId/create-payment-order", protect, createPaymentOrder);
router.post("/:billId/verify-payment", protect, verifyPayment);

module.exports = router;
