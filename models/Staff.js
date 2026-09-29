const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "chef", "cashier"], required: true }
  },
  { timestamps: true }
);

staffSchema.index({ restaurantId: 1, role: 1 });

module.exports = mongoose.model("Staff", staffSchema);
