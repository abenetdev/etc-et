const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // User/Customer info
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Vendor/Store info — one vendor per order document
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Links split orders created from the same checkout/payment
    orderGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    
    // Cart reference
    cartId: String,
    
    // Order items
    cartItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        title: String,
        image: String,
        price: String,
        quantity: Number,
        vendorId: mongoose.Schema.Types.ObjectId, // Track which vendor sold this item
      },
    ],
    
    // Shipping address
    addressInfo: {
      addressId: String,
      address: String,
      city: String,
      pincode: String,
      phone: String,
      notes: String,
    },
    
    // Order status
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    
    // Payment info
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    
    // Dates
    orderDate: {
      type: Date,
      default: Date.now,
    },
    orderUpdateDate: {
      type: Date,
      default: Date.now,
    },
    
    // Payment IDs (PayPal, Stripe, etc.)
    paymentId: String,
    payerId: String,
    
    // Customer name (for easy display)
    customerName: String,

    // Customer confirms receipt after vendor marks delivered
    deliveryConfirmedByCustomer: {
      type: Boolean,
      default: false,
    },
    deliveryConfirmedAt: Date,

    // Escrow — admin releases funds after customer confirms delivery
    escrowReleased: {
      type: Boolean,
      default: false,
    },
    escrowReleasedAt: Date,
    escrowReleasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    escrowRejected: {
      type: Boolean,
      default: false,
    },
    escrowRejectionNote: String,
    escrowRejectedAt: Date,
    escrowRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
OrderSchema.index({ userId: 1, orderStatus: 1 });
OrderSchema.index({ vendorId: 1, orderStatus: 1 });
OrderSchema.index({ orderGroupId: 1 });
OrderSchema.index({ orderDate: -1 });

// Update orderUpdateDate before saving
OrderSchema.pre('save', function(next) {
  this.orderUpdateDate = new Date();
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
