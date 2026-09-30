const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff");
const Customer = require("../models/Customer");
const generateToken = require("../utils/generateToken");

/**
 * Owner signup — creates the Restaurant + the first Staff record (role: owner).
 * Chef/cashier accounts are NOT created here — the owner creates those
 * from the admin panel via a separate protected route.
 */
const registerOwner = async (req, res) => {
  try {
    const { name, phone, password, restaurantName, restaurantAddress } = req.body;

    const existing = await Staff.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const Restaurant = require("../models/Restaurant");
    const restaurant = await Restaurant.create({ name: restaurantName, address: restaurantAddress });

    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await Staff.create({
      restaurantId: restaurant._id,
      name,
      phone,
      passwordHash,
      role: "owner"
    });

    restaurant.ownerId = owner._id;
    await restaurant.save();

    const token = generateToken({ id: owner._id, role: "owner", restaurantId: restaurant._id });
    res.status(201).json({ token, user: { id: owner._id, name, role: "owner" }, restaurantId: restaurant._id });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

/** Staff login (owner, chef, or cashier) */
const loginStaff = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(phone, 'phone number-----');
    console.log(password, 'password------');
    const staff = await Staff.findOne({ phone });

    if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    const token = generateToken({ id: staff._id, role: staff.role, restaurantId: staff.restaurantId });
    res.json({ token, user: { id: staff._id, name: staff.name, role: staff.role, restaurantId: staff.restaurantId }, restaurantId: staff.restaurantId });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

/** Customer signup */
const registerCustomer = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    console.log(name, 'name-----');
    console.log(phone, 'phone number-----');
    console.log(password, 'password------');
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await Customer.create({ name, phone, passwordHash });

    const token = generateToken({ id: customer._id, role: "customer" });
    res.status(201).json({ token, user: { id: customer._id, name, role: "customer" } });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

/** Customer login */
const loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(phone, 'phone number-----');
    console.log(password, 'password------');
    const customer = await Customer.findOne({ phone });

    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    const token = generateToken({ id: customer._id, role: "customer" });
    res.json({ token, user: { id: customer._id, name: customer.name, role: "customer" } });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

module.exports = { registerOwner, loginStaff, registerCustomer, loginCustomer };
