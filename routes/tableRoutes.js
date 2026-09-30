const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const { createTable, getTables, getTableByToken, getPublicTables } = require("../controllers/tableController");

router.post("/", protect, allowRoles("owner"), createTable);
router.get("/", protect, allowRoles("owner"), getTables);
router.get("/public", getPublicTables); // public list for table selection
router.get("/token/:qrToken", getTableByToken); // public - hit right after a QR scan

module.exports = router;
