const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    portionSize: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "OrderSession", required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    items: [billItemSchema],
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash", "card", "online", "upi"], default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

billSchema.index({ restaurantId: 1, paymentStatus: 1 });

module.exports = mongoose.model("Bill", billSchema);
