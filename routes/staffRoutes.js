const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const { createStaff, getStaff } = require("../controllers/staffController");

// Only the owner can create or view staff accounts for their restaurant
router.post("/", protect, allowRoles("owner"), createStaff);
router.get("/", protect, allowRoles("owner"), getStaff);

module.exports = router;
