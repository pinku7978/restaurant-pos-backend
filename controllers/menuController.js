const MenuItem = require("../models/MenuItem");

/** Owner adds a menu item */
const createMenuItem = async (req, res) => {
  try {
    const { name, description, category, images, portions } = req.body;

    const item = await MenuItem.create({
      restaurantId: req.user.restaurantId,
      name,
      description,
      category,
      images,
      portions
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: "Failed to create menu item", error: err.message });
  }
};

/**
 * Public-ish menu fetch (customer scanning a QR code needs this).
 * restaurantId comes from the table's QR token, not the JWT, since
 * a customer may not be logged in to just browse the menu yet.
 */
const getMenuForRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const items = await MenuItem.find({ restaurantId, isAvailable: true });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch menu", error: err.message });
  }
};

/** Owner updates a menu item (price, availability, images, etc.) */
const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId }, // tenant-scoped, can't edit another restaurant's item
      req.body,
      { new: true }
    );

    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Failed to update menu item", error: err.message });
  }
};

module.exports = { createMenuItem, getMenuForRestaurant, updateMenuItem };
