const express = require("express");
const router = express.Router();
const {
  registerOwner,
  loginStaff,
  registerCustomer,
  loginCustomer
} = require("../controllers/authController");

router.post("/owner/register", registerOwner);
router.post("/staff/login", loginStaff);       // used by owner, chef, cashier
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);

module.exports = router;
