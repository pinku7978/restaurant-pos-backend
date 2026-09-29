const Bill = require("../models/Bill");
const OrderSession = require("../models/OrderSession");

/** Fetch the bill for a session — used by both the customer's screen and the cashier's */
const getBillBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const bill = await Bill.findOne({ sessionId }).sort({ generatedAt: -1 });

    if (!bill) return res.status(404).json({ message: "No bill found for this session" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bill", error: err.message });
  }
};

/** Cashier's dashboard — every unpaid bill, restaurant-wide */
const getPendingBills = async (req, res) => {
  try {
    const bills = await Bill.find({
      restaurantId: req.user.restaurantId,
      paymentStatus: "pending"
    }).populate("tableId", "tableNumber");

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending bills", error: err.message });
  }
};

/**
 * Cashier marks a bill as paid. This also closes out the OrderSession,
 * freeing up that session slot at the table for a new group.
 */
const markBillPaid = async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentMethod } = req.body; // "cash" | "card" | "online"

    const bill = await Bill.findOne({ _id: billId, restaurantId: req.user.restaurantId });
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    bill.paymentStatus = "paid";
    bill.paymentMethod = paymentMethod || "cash";
    bill.paidAt = new Date();
    await bill.save();

    await OrderSession.findByIdAndUpdate(bill.sessionId, {
      status: "closed",
      closedAt: new Date()
    });

    const io = req.app.get("io");
    io.to(`restaurant_${req.user.restaurantId}_cashier`).emit("bill_paid", { billId: bill._id });

    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark bill as paid", error: err.message });
  }
};

module.exports = { getBillBySession, getPendingBills, markBillPaid };
