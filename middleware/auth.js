const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT from the Authorization header and attaches
 * the decoded payload (id, role, restaurantId) to req.user.
 * Every route that needs a logged-in user goes through this first.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, restaurantId }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

module.exports = protect;
