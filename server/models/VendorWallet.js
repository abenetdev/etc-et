const mongoose = require("mongoose");

// ── VendorWallet ───────────────────────────────────────────────────────────
const VendorWalletSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalRevenue:    { type: Number, default: 0, min: 0 },
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance:  { type: Number, default: 0, min: 0 },
    withdrawnAmount: { type: Number, default: 0, min: 0 },
    totalOrders:     { type: Number, default: 0, min: 0 },
    commissionRate:  { type: Number, default: 10 }, // platform takes 10%
  },
  { timestamps: true }
);

VendorWalletSchema.index({ vendorId: 1 }, { unique: true });

// ── WalletTransaction ──────────────────────────────────────────────────────
const WalletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorWallet",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["SALE", "COMMISSION", "REFUND", "WITHDRAWAL", "ADJUSTMENT"],
      required: true,
    },
    amount:      { type: Number, required: true },
    status:      { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"], default: "PENDING" },
    description: { type: String, default: "" },
    reference:   { type: String, default: "" }, // order ID, withdrawal ID, etc.
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ vendorId: 1, createdAt: -1 });
WalletTransactionSchema.index({ walletId: 1, type: 1 });

// ── WithdrawalRequest ──────────────────────────────────────────────────────
const WithdrawalRequestSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount:       { type: Number, required: true, min: 1 },
    status:       { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "PAID"], default: "PENDING" },
    adminNote:    { type: String, default: "" },
    requestedAt:  { type: Date, default: Date.now },
    processedAt:  { type: Date },

    // Payout method snapshot at time of request
    payoutMethod: { type: String, enum: ["bank", "chapa", "mobile_money"], default: "bank" },
    payoutDetails: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

WithdrawalRequestSchema.index({ vendorId: 1, status: 1 });

// ── PayoutSettings ─────────────────────────────────────────────────────────
const PayoutSettingsSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Bank Transfer
    bankName:            { type: String, default: "" },
    accountHolderName:   { type: String, default: "" },
    accountNumber:       { type: String, default: "" },
    // Chapa
    chapaAccountName:    { type: String, default: "" },
    chapaAccountNumber:  { type: String, default: "" },
    // Mobile Money
    mobileMoneyNumber:   { type: String, default: "" },
    preferredMethod:     { type: String, enum: ["bank", "chapa", "mobile_money"], default: "bank" },
  },
  { timestamps: true }
);

PayoutSettingsSchema.index({ vendorId: 1 }, { unique: true });

module.exports = {
  VendorWallet:       mongoose.model("VendorWallet", VendorWalletSchema),
  WalletTransaction:  mongoose.model("WalletTransaction", WalletTransactionSchema),
  WithdrawalRequest:  mongoose.model("WithdrawalRequest", WithdrawalRequestSchema),
  PayoutSettings:     mongoose.model("PayoutSettings", PayoutSettingsSchema),
};
