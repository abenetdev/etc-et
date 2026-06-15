const mongoose = require("mongoose");

const SellerApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one application per user
    },
    storeName:        { type: String, required: true, trim: true },
    storeDescription: { type: String, default: "" },
    phone:            { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote:   { type: String, default: "" },
    reviewedAt:  { type: Date },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SellerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SellerApplication", SellerApplicationSchema);
