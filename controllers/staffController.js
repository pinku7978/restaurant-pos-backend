const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff");

/** Owner creates a chef or cashier account under their own restaurant */
const createStaff = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!["chef", "cashier"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'chef' or 'cashier'" });
    }

    const existing = await Staff.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await Staff.create({
      restaurantId: req.user.restaurantId, // taken from the owner's token, never from the request body
      name,
      phone,
      passwordHash,
      role
    });

    res.status(201).json({ id: staff._id, name: staff.name, role: staff.role });
  } catch (err) {
    res.status(500).json({ message: "Failed to create staff account", error: err.message });
  }
};

/** Owner views all staff for their restaurant */
const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ restaurantId: req.user.restaurantId }).select("-passwordHash");
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff", error: err.message });
  }
};

module.exports = { createStaff, getStaff };
