const OrderSession = require("../models/OrderSession");
const Order = require("../models/Order");
const Bill = require("../models/Bill");
const Table = require("../models/Table");

/**
 * Customer starts a NEW session at a table — used when a fresh group
 * sits down and no one has scanned in yet, or when a second group
 * (e.g. the "2 couples at one table" case) wants a separate bill.
 */
const createSession = async (req, res) => {
  try {
    const { tableId } = req.body;

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: "Table not found" });

    const session = await OrderSession.create({
      restaurantId: table.restaurantId,
      tableId,
      participants: [req.user.id],
      status: "active"
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: "Failed to create session", error: err.message });
  }
};

/**
 * Customer joins an EXISTING active session at the table — used when
 * someone else at the same table already started ordering and this
 * person wants to be part of the same bill.
 */
const joinSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await OrderSession.findOne({ _id: sessionId, status: "active" });
    if (!session) return res.status(404).json({ message: "Active session not found" });

    if (!session.participants.includes(req.user.id)) {
      session.participants.push(req.user.id);
      await session.save();
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Failed to join session", error: err.message });
  }
};

/** Returns every active/open session at a given table, so a customer can pick one to join */
const getActiveSessionsForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const sessions = await OrderSession.find({ tableId, status: "active" });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions", error: err.message });
  }
};

/** Cashier's dashboard — every session that's active or awaiting payment, restaurant-wide */
const getActiveSessionsForRestaurant = async (req, res) => {
  try {
    const sessions = await OrderSession.find({
      restaurantId: req.user.restaurantId,
      status: { $in: ["active", "bill_requested"] }
    }).populate("tableId", "tableNumber");

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions", error: err.message });
  }
};

/**
 * Customer taps "Get Bill". This:
 * 1. Pulls every Order tied to this session
 * 2. Flattens all items into one bill with a computed total
 * 3. Marks the session as bill_requested
 * 4. Pushes a real-time alert to the cashier's screen
 */
const requestBill = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await OrderSession.findOne({ _id: sessionId, status: "active" });
    if (!session) return res.status(404).json({ message: "Active session not found" });

    const orders = await Order.find({ sessionId });

    const items = [];
    let totalAmount = 0;
    for (const order of orders) {
      for (const item of order.items) {
        items.push({
          name: item.name,
          portionSize: item.portionSize,
          price: item.price,
          quantity: item.quantity
        });
        totalAmount += item.price * item.quantity;
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ message: "No items ordered yet in this session" });
    }

    const bill = await Bill.create({
      sessionId: session._id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      items,
      totalAmount
    });

    session.status = "bill_requested";
    await session.save();

    const io = req.app.get("io");
    io.to(`restaurant_${session.restaurantId}_cashier`).emit("bill_requested", bill);

    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate bill", error: err.message });
  }
};

module.exports = {
  createSession,
  joinSession,
  getActiveSessionsForTable,
  getActiveSessionsForRestaurant,
  requestBill
};
