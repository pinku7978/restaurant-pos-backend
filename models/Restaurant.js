const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
