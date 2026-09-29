const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  placeOrder,
  getKitchenOrders,
  updateItemStatus
} = require("../controllers/orderController");

router.post("/", protect, allowRoles("customer"), placeOrder);
router.get("/kitchen", protect, allowRoles("chef", "owner"), getKitchenOrders);
router.patch("/:orderId/items/:itemId", protect, allowRoles("chef", "owner"), updateItemStatus);

module.exports = router;
