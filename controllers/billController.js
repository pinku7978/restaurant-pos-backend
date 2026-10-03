const crypto = require("crypto");
const Bill = require("../models/Bill");
const OrderSession = require("../models/OrderSession");
const { getRazorpayInstance } = require("../config/razorpay");

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
 * Cashier marks a bill as paid manually (Cash or standard Card).
 * This also closes out the OrderSession, freeing up that session slot at the table.
 */
const markBillPaid = async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentMethod } = req.body; // "cash" | "card" | "online" | "upi"

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
    if (io) {
      io.to(`restaurant_${req.user.restaurantId}_cashier`).emit("bill_paid", {
        billId: bill._id,
        paymentMethod: bill.paymentMethod,
        amount: bill.totalAmount
      });
    }

    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark bill as paid", error: err.message });
  }
};

/**
 * Step 1: Create a Razorpay Order for a Bill.
 * Can be initiated either by customer (Pay Online) or cashier (Generate Payment QR / Link).
 */
const createPaymentOrder = async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    if (req.user.restaurantId && bill.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: "Not authorized to access this bill" });
    }

    if (bill.paymentStatus === "paid") {
      return res.status(400).json({ message: "This bill has already been paid" });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({
        message: "Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
      });
    }

    // Razorpay amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(bill.totalAmount * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `bill_${bill._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`,
      notes: {
        billId: bill._id.toString(),
        sessionId: bill.sessionId?.toString(),
        tableId: bill.tableId?.toString(),
        restaurantId: bill.restaurantId?.toString()
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    bill.razorpayOrderId = razorpayOrder.id;
    await bill.save();

    res.status(200).json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      billId: bill._id,
      totalAmount: bill.totalAmount
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ message: "Failed to create payment order", error: err.message });
  }
};

/**
 * Step 3: Verify the payment signature sent back from Razorpay Checkout.
 * Critical security step: computes HMAC SHA256 using RAZORPAY_KEY_SECRET.
 */
const verifyPayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        message: "Missing required payment verification parameters (razorpayOrderId, razorpayPaymentId, razorpaySignature)"
      });
    }

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    // Idempotent: If already marked paid, return success immediately
    if (bill.paymentStatus === "paid") {
      return res.json({ success: true, message: "Bill is already settled", bill });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ message: "Razorpay secret key not configured on server" });
    }

    // Signature verification: HMAC SHA256 of order_id + "|" + payment_id
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Payment verification failed: Invalid signature" });
    }

    // Authentic payment - mark bill as paid
    bill.paymentStatus = "paid";
    bill.paymentMethod = "online";
    bill.razorpayOrderId = razorpayOrderId;
    bill.razorpayPaymentId = razorpayPaymentId;
    bill.razorpaySignature = razorpaySignature;
    bill.paidAt = new Date();
    await bill.save();

    // Close the order session
    await OrderSession.findByIdAndUpdate(bill.sessionId, {
      status: "closed",
      closedAt: new Date()
    });

    // Notify cashier real-time via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${bill.restaurantId}_cashier`).emit("bill_paid", {
        billId: bill._id,
        paymentMethod: "online",
        amount: bill.totalAmount
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully and bill settled",
      bill
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Payment verification failed", error: err.message });
  }
};

module.exports = {
  getBillBySession,
  getPendingBills,
  markBillPaid,
  createPaymentOrder,
  verifyPayment
};
