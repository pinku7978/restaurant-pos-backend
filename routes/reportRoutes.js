const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  getItemPerformance,
  getSalesSummary,
  getTableTurnover
} = require("../controllers/reportController");

// All reports are owner-only. Optional ?startDate=&endDate= (ISO strings) on each.
router.get("/item-performance", protect, allowRoles("owner"), getItemPerformance);
router.get("/sales-summary", protect, allowRoles("owner"), getSalesSummary);
router.get("/table-turnover", protect, allowRoles("owner"), getTableTurnover);

module.exports = router;
