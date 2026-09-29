const Order = require("../models/Order");
const Table = require("../models/Table");

/**
 * Customer places an order within their session.
 * A customer's JWT has no restaurantId (they aren't tied to one restaurant),
 * so it's looked up from the table instead — never trust a restaurantId
 * sent in the request body for a customer-facing route.
 */
const placeOrder = async (req, res) => {
  try {
    const { sessionId, tableId, items } = req.body;

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: "Table not found" });

    const order = await Order.create({
      sessionId,
      restaurantId: table.restaurantId,
      tableId,
      items
    });

    // Push to the kitchen in real time — include tableNumber directly so the
    // display doesn't need a separate lookup just to announce/show it
    const io = req.app.get("io");
    io.to(`restaurant_${table.restaurantId}_kitchen`).emit("new_order", {
      ...order.toObject(),
      tableNumber: table.tableNumber
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to place order", error: err.message });
  }
};

/** Chef fetches all active orders for their restaurant */
const getKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      restaurantId: req.user.restaurantId,
      "items.status": { $in: ["new", "preparing", "ready"] }
    })
      .populate("tableId", "tableNumber")
      .sort({ placedAt: 1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen orders", error: err.message });
  }
};

/** Chef updates a single item's status within an order */
const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: orderId, restaurantId: req.user.restaurantId, "items._id": itemId },
      { $set: { "items.$.status": status } },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order or item not found" });

    const io = req.app.get("io");
    io.to(`restaurant_${req.user.restaurantId}_cashier`).emit("item_status_updated", {
      orderId,
      itemId,
      status
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to update item status", error: err.message });
  }
};

module.exports = { placeOrder, getKitchenOrders, updateItemStatus };
