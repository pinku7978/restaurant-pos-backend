const mongoose = require("mongoose");

const portionSchema = new mongoose.Schema(
  {
    size: { type: String, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["starter", "main", "dessert", "drink"],
      required: true
    },
    images: [{ type: String }],
    portions: [portionSchema],
    isAvailable: { type: Boolean, default: true }
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, category: 1 });

module.exports = mongoose.model("MenuItem", menuItemSchema);
