/**
 * Restricts a route to specific roles. Must run AFTER `protect`,
 * since it reads req.user set by the auth middleware.
 *
 * Usage: router.get("/kitchen-orders", protect, allowRoles("chef"), handler)
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This action requires one of these roles: ${roles.join(", ")}`
      });
    }

    next();
  };
};

module.exports = allowRoles;
