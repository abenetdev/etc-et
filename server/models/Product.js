const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    // ── Vendor reference ───────────────────────────────────────────────────
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
    },

    // ── New canonical fields (used by vendor dashboard) ────────────────────
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      default: "",
    },
    // Multiple images from vendor upload
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // ── Legacy fields (kept in sync for the shop controllers) ─────────────
    // These are AUTO-UPDATED by the pre-save hook below.
    // Do NOT write to these directly — write to name/images/stock instead.
    title: {
      type: String,
    },
    image: {
      type: String,
      default: "",
    },
    totalStock: {
      type: Number,
      default: 0,
    },
    averageReview: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save hook: keep legacy fields in sync automatically ────────────────
ProductSchema.pre("save", function (next) {
  // name → title
  if (this.name && this.name !== this.title) {
    this.title = this.name;
  } else if (this.title && !this.name) {
    this.name = this.title;
  }

  // images[0] → image (primary image for shop tiles)
  if (this.images && this.images.length > 0) {
    this.image = this.images[0];
  } else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }

  // stock → totalStock
  if (this.stock !== undefined && this.stock !== this.totalStock) {
    this.totalStock = this.stock;
  } else if (this.totalStock !== undefined && this.stock === undefined) {
    this.stock = this.totalStock;
  }

  next();
});

// ── Also sync on findOneAndUpdate / updateMany operations ─────────────────
ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  if (update.name) update.title = update.name;
  if (update.title && !update.name) update.name = update.title;

  if (update.images && update.images.length > 0) {
    update.image = update.images[0];
  }

  if (update.stock !== undefined) update.totalStock = update.stock;
  if (update.totalStock !== undefined && update.stock === undefined) {
    update.stock = update.totalStock;
  }

  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────
ProductSchema.index({ storeId: 1, status: 1 });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ name: "text", title: "text", description: "text" });

// ── Virtuals ───────────────────────────────────────────────────────────────
ProductSchema.virtual("isOnSale").get(function () {
  return this.salePrice > 0 && this.salePrice < this.price;
});

ProductSchema.virtual("finalPrice").get(function () {
  return this.isOnSale ? this.salePrice : this.price;
});

// ── Display name (whichever is set) ───────────────────────────────────────
ProductSchema.virtual("displayName").get(function () {
  return this.name || this.title || "Unnamed Product";
});

// ── Primary image (whichever is set) ─────────────────────────────────────
ProductSchema.virtual("primaryImage").get(function () {
  if (this.images && this.images.length > 0) return this.images[0];
  return this.image || "";
});

module.exports = mongoose.model("Product", ProductSchema);
