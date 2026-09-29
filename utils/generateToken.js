const jwt = require("jsonwebtoken");

/**
 * Creates a JWT that carries everything role-based middleware needs
 * to authorize a request without hitting the database again.
 *
 * payload shape:
 *  - id: the Staff or Customer _id
 *  - role: "owner" | "chef" | "cashier" | "customer"
 *  - restaurantId: null for customers, required for staff
 */
const generateToken = ({ id, role, restaurantId = null }) => {
  return jwt.sign({ id, role, restaurantId }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

module.exports = generateToken;
