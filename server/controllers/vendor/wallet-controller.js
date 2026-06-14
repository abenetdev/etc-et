const {
  VendorWallet,
  WalletTransaction,
  WithdrawalRequest,
  PayoutSettings,
} = require("../../models/VendorWallet");

const COMMISSION_RATE = 0.10; // 10% platform fee
const MIN_WITHDRAWAL  = 100;  // ETB 100 minimum

// ── Helper ─────────────────────────────────────────────────────────────────
async function getOrCreateWallet(vendorId) {
  let wallet = await VendorWallet.findOne({ vendorId });
  if (!wallet) wallet = await VendorWallet.create({ vendorId });
  return wallet;
}

// ── GET /api/vendor/wallet ─────────────────────────────────────────────────
const getWallet = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const wallet = await getOrCreateWallet(vendorId);
    res.status(200).json({ success: true, data: wallet });
  } catch (e) {
    console.error("getWallet:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/vendor/wallet/transactions ────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { type, status, page = 1, limit = 20 } = req.query;

    const query = { vendorId };
    if (type)   query.type   = type.toUpperCase();
    if (status) query.status = status.toUpperCase();

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await WalletTransaction.countDocuments(query);
    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("getTransactions:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/vendor/wallet/withdrawals ─────────────────────────────────────
const getWithdrawals = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status } = req.query;

    const query = { vendorId };
    if (status) query.status = status.toUpperCase();

    const withdrawals = await WithdrawalRequest.find(query)
      .sort({ requestedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: withdrawals });
  } catch (e) {
    console.error("getWithdrawals:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── POST /api/vendor/wallet/withdraw ──────────────────────────────────────
const requestWithdrawal = async (req, res) => {
  try {
    const vendorId     = req.user.id;
    const { amount }   = req.body;
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number" });
    }
    if (parsedAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ETB ${MIN_WITHDRAWAL}` });
    }

    const wallet = await getOrCreateWallet(vendorId);
    if (parsedAmount > wallet.availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ETB ${wallet.availableBalance.toFixed(2)}`,
      });
    }

    const payoutSettings = await PayoutSettings.findOne({ vendorId }).lean();
    if (!payoutSettings) {
      return res.status(400).json({
        success: false,
        message: "Configure your payout settings before requesting withdrawal",
      });
    }

    const withdrawal = await WithdrawalRequest.create({
      vendorId,
      amount:      parsedAmount,
      status:      "PENDING",
      payoutMethod: payoutSettings.preferredMethod,
      payoutDetails: {
        bankName:           payoutSettings.bankName,
        accountHolderName:  payoutSettings.accountHolderName,
        accountNumber:      payoutSettings.accountNumber,
        chapaAccountName:   payoutSettings.chapaAccountName,
        chapaAccountNumber: payoutSettings.chapaAccountNumber,
        mobileMoneyNumber:  payoutSettings.mobileMoneyNumber,
      },
    });

    await WalletTransaction.create({
      walletId:    wallet._id,
      vendorId,
      type:        "WITHDRAWAL",
      amount:      parsedAmount,
      status:      "PENDING",
      description: "Withdrawal request submitted",
      reference:   withdrawal._id.toString(),
    });

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: "Withdrawal request submitted and pending approval.",
    });
  } catch (e) {
    console.error("requestWithdrawal:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/vendor/wallet/earnings-breakdown ─────────────────────────────
const getEarningsBreakdown = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const wallet   = await getOrCreateWallet(vendorId);

    const salesAgg = await WalletTransaction.aggregate([
      { $match: { vendorId: wallet.vendorId, type: "SALE", status: { $in: ["COMPLETED", "PENDING"] } } },
      { $group: { _id: null, grossSales: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const grossSales   = salesAgg[0]?.grossSales || 0;
    const platformFees = grossSales * COMMISSION_RATE;
    const netEarnings  = grossSales - platformFees;

    res.status(200).json({
      success: true,
      data: { grossSales, platformFees, netEarnings, commissionRate: COMMISSION_RATE * 100, totalOrders: wallet.totalOrders, wallet },
    });
  } catch (e) {
    console.error("getEarningsBreakdown:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/vendor/wallet/payout-settings ────────────────────────────────
const getPayoutSettings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const settings = await PayoutSettings.findOne({ vendorId });
    res.status(200).json({ success: true, data: settings || null });
  } catch (e) {
    console.error("getPayoutSettings:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/vendor/wallet/payout-settings ────────────────────────────────
const updatePayoutSettings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      bankName, accountHolderName, accountNumber,
      chapaAccountName, chapaAccountNumber,
      mobileMoneyNumber, preferredMethod,
    } = req.body;

    const settings = await PayoutSettings.findOneAndUpdate(
      { vendorId },
      { bankName: bankName||"", accountHolderName: accountHolderName||"", accountNumber: accountNumber||"",
        chapaAccountName: chapaAccountName||"", chapaAccountNumber: chapaAccountNumber||"",
        mobileMoneyNumber: mobileMoneyNumber||"", preferredMethod: preferredMethod||"bank" },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: settings, message: "Payout settings saved!" });
  } catch (e) {
    console.error("updatePayoutSettings:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── INTERNAL: credit vendor when order is paid ────────────────────────────
const creditOrderEarnings = async (vendorId, orderAmount, orderId) => {
  try {
    const wallet      = await getOrCreateWallet(vendorId);
    const commission  = parseFloat((orderAmount * COMMISSION_RATE).toFixed(2));
    const vendorShare = parseFloat((orderAmount - commission).toFixed(2));

    wallet.totalRevenue   += orderAmount;
    wallet.pendingBalance += vendorShare;
    wallet.totalOrders    += 1;
    await wallet.save();

    await WalletTransaction.create({
      walletId: wallet._id, vendorId, type: "SALE", amount: vendorShare, status: "PENDING",
      description: `Order sale (${COMMISSION_RATE * 100}% commission deducted)`, reference: orderId,
    });
    await WalletTransaction.create({
      walletId: wallet._id, vendorId, type: "COMMISSION", amount: -commission, status: "COMPLETED",
      description: `Platform commission (${COMMISSION_RATE * 100}%)`, reference: orderId,
    });

    return { success: true };
  } catch (e) {
    console.error("creditOrderEarnings:", e);
    return { success: false, error: e.message };
  }
};

// ── INTERNAL: release escrow when order is delivered ──────────────────────
const releaseEscrow = async (vendorId, orderAmount, orderId) => {
  try {
    const vid = vendorId.toString();
    const orderIdStr = orderId.toString();

    const saleTx = await WalletTransaction.findOne({
      vendorId: vid,
      type: "SALE",
      reference: orderIdStr,
    });

    if (!saleTx) {
      return { success: false, error: "No sale transaction found for this order" };
    }

    // Idempotent — already released
    if (saleTx.status === "COMPLETED") {
      return { success: true, alreadyReleased: true };
    }

    const wallet = await getOrCreateWallet(vid);
    const vendorShare = saleTx.amount;

    wallet.pendingBalance   = Math.max(0, wallet.pendingBalance - vendorShare);
    wallet.availableBalance += vendorShare;
    await wallet.save();

    saleTx.status = "COMPLETED";
    saleTx.description = "Admin confirmed delivery — funds released to available balance";
    await saleTx.save();

    return { success: true };
  } catch (e) {
    console.error("releaseEscrow:", e);
    return { success: false, error: e.message };
  }
};

/** Admin-only: moves escrow → available balance after delivery is verified */
const releaseEscrowForOrder = async (order) => {
  if (!order || order.paymentStatus !== "paid") {
    return { success: false, error: "Order not paid" };
  }

  if (order.orderStatus !== "delivered") {
    return { success: false, error: "Order is not marked as delivered" };
  }

  if (order.escrowRejected) {
    return { success: false, error: "Escrow release was already rejected for this order" };
  }

  const vendorId = order.vendorId?._id || order.vendorId;
  if (!vendorId) {
    return { success: false, error: "No vendor on order" };
  }

  return releaseEscrow(vendorId, order.totalAmount, order._id);
};

/** Admin-only: reject escrow release and remove pending vendor share */
const rejectEscrowForOrder = async (order, adminNote) => {
  try {
    if (!order || order.paymentStatus !== "paid") {
      return { success: false, error: "Order not paid" };
    }

    if (order.escrowReleased) {
      return { success: false, error: "Funds have already been released" };
    }

    if (order.escrowRejected) {
      return { success: false, error: "Escrow release was already rejected" };
    }

    const vendorId = (order.vendorId?._id || order.vendorId)?.toString();
    if (!vendorId) {
      return { success: false, error: "No vendor on order" };
    }

    const orderIdStr = order._id.toString();
    const saleTx = await WalletTransaction.findOne({
      vendorId,
      type: "SALE",
      reference: orderIdStr,
    });

    if (!saleTx) {
      return { success: false, error: "No sale transaction found for this order" };
    }

    if (saleTx.status === "COMPLETED") {
      return { success: false, error: "Funds have already been released" };
    }

    const wallet = await getOrCreateWallet(vendorId);
    const vendorShare = saleTx.amount;

    wallet.pendingBalance = Math.max(0, wallet.pendingBalance - vendorShare);
    await wallet.save();

    saleTx.status = "CANCELLED";
    saleTx.description = `Release rejected: ${adminNote}`;
    await saleTx.save();

    return { success: true };
  } catch (e) {
    console.error("rejectEscrowForOrder:", e);
    return { success: false, error: e.message };
  }
};

module.exports = {
  getWallet, getTransactions, getWithdrawals, requestWithdrawal,
  getEarningsBreakdown, getPayoutSettings, updatePayoutSettings,
  creditOrderEarnings, releaseEscrow, releaseEscrowForOrder, rejectEscrowForOrder,
};
