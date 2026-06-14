const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema(
  {
    // Owner reference
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One store per vendor
    },

    // ── Store Information ──────────────────────────────────────
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },

    slug: {
      type: String,
      required: [true, "Store slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase, no spaces, hyphens allowed (e.g. my-store)",
      ],
    },

    description: {
      type: String,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    businessCategory: {
      type: String,
      enum: [
        "fashion",
        "electronics",
        "beauty",
        "home-living",
        "automotive",
        "sports",
        "food-beverage",
        "health-wellness",
        "books",
        "other",
      ],
      default: "other",
    },

    status: {
      type: String,
      enum: ["active", "temporarily-closed"],
      default: "active",
    },

    // ── Branding ──────────────────────────────────────────────
    logo: {
      type: String,
      default: "",
    },

    banner: {
      type: String,
      default: "",
    },

    primaryColor: {
      type: String,
      default: "#2563EB",
      match: [/^#([A-Fa-f0-9]{6})$/, "Invalid hex color"],
    },

    secondaryColor: {
      type: String,
      default: "#1E40AF",
      match: [/^#([A-Fa-f0-9]{6})$/, "Invalid hex color"],
    },

    // ── Contact Information ───────────────────────────────────

    city: {
      type: String,
      default: "",
    },

    region: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },
    // ── Store Policies ────────────────────────────────────────
    aboutUs: {
      type: String,
      default: "",
    },

    returnPolicy: {
      type: String,
      default: "",
    },

    shippingPolicy: {
      type: String,
      default: "",
    },

    privacyPolicy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ slug: 1 }, { unique: true });
StoreSchema.index({ status: 1 });

module.exports = mongoose.model("Store", StoreSchema);
