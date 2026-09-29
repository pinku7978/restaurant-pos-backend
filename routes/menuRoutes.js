const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  createMenuItem,
  getMenuForRestaurant,
  updateMenuItem
} = require("../controllers/menuController");

// Public: anyone who scanned a table QR can view the menu, no login required
router.get("/:restaurantId", getMenuForRestaurant);

// Owner-only: managing the menu
router.post("/", protect, allowRoles("owner"), createMenuItem);
router.patch("/:id", protect, allowRoles("owner"), updateMenuItem);

module.exports = router;
