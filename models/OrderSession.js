const mongoose = require("mongoose");

const orderSessionSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
    status: {
      type: String,
      enum: ["active", "bill_requested", "paid", "closed"],
      default: "active"
    },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

orderSessionSchema.index({ restaurantId: 1, tableId: 1, status: 1 });

module.exports = mongoose.model("OrderSession", orderSessionSchema);
