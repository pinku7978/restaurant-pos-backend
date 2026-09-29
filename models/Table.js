const mongoose = require("mongoose");
const crypto = require("crypto");

const tableSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableNumber: { type: Number, required: true },
    qrToken: {
      type: String,
      default: () => crypto.randomBytes(16).toString("hex"),
      unique: true
    }
  },
  { timestamps: true }
);

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

module.exports = mongoose.model("Table", tableSchema);
