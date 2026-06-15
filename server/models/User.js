const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "vendor", "admin"],
    default: "user",
  },
  // Vendor account status (active by default)
  accountStatus: {
    type: String,
    enum: ["active", "deactivated", "deleted"],
    default: "active",
  },
  // Force password change on next login
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  // Seller onboarding status
  sellerStatus: {
    type: String,
    enum: ["pending", "active", "rejected", null],
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
