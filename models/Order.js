const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },       // snapshot at order time
    portionSize: { type: String, required: true },
    price: { type: Number, required: true },        // snapshot at order time
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["new", "preparing", "ready", "served"],
      default: "new"
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "OrderSession", required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    items: [orderItemSchema],
    placedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

orderSchema.index({ restaurantId: 1, "items.status": 1 });
orderSchema.index({ sessionId: 1 });

module.exports = mongoose.model("Order", orderSchema);
