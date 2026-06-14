const User = require("../../models/User");
const Store = require("../../models/Store");
const {
  VendorWallet,
  WalletTransaction,
  WithdrawalRequest,
} = require("../../models/VendorWallet");

function enrichWithdrawals(withdrawals, vendorMap, storeMap) {
  return withdrawals.map((w) => {
    const vid = w.vendorId.toString();
    const vendor = vendorMap[vid];
    const store = storeMap[vid];
    return {
      ...w,
      vendorName: vendor?.userName || "Unknown",
      vendorEmail: vendor?.email || "",
      storeName: store?.storeName || "—",
      storeSlug: store?.slug || "",
    };
  });
}

async function loadVendorStoreMaps(vendorIds) {
  const [vendors, stores] = await Promise.all([
    User.find({ _id: { $in: vendorIds } }).select("userName email").lean(),
    Store.find({ ownerId: { $in: vendorIds } }).select("ownerId storeName slug").lean(),
  ]);
  const vendorMap = {};
  vendors.forEach((v) => { vendorMap[v._id.toString()] = v; });
  const storeMap = {};
  stores.forEach((s) => { storeMap[s.ownerId.toString()] = s; });
  return { vendorMap, storeMap };
}

// GET /api/admin/withdrawals
const getAllWithdrawals = async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};
    if (status && status !== "all") query.status = status.toUpperCase();

    let withdrawals = await WithdrawalRequest.find(query)
      .sort({ requestedAt: -1 })
      .lean();

    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      const vendors = await User.find({
        role: "vendor",
        $or: [
          { userName: new RegExp(term, "i") },
          { email: new RegExp(term, "i") },
        ],
      }).select("_id");
      const vendorIds = vendors.map((v) => v._id);

      withdrawals = withdrawals.filter(
        (w) =>
          vendorIds.some((id) => id.toString() === w.vendorId.toString()) ||
          w._id.toString().includes(term)
      );
    }

    const vendorIds = [...new Set(withdrawals.map((w) => w.vendorId))];
    const { vendorMap, storeMap } = await loadVendorStoreMaps(vendorIds);
    const rows = enrichWithdrawals(withdrawals, vendorMap, storeMap);

    res.status(200).json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (e) {
    console.error("getAllWithdrawals:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// GET /api/admin/withdrawals/:id
const getWithdrawalById = async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id).lean();
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    const { vendorMap, storeMap } = await loadVendorStoreMaps([withdrawal.vendorId]);
    const [row] = enrichWithdrawals([withdrawal], vendorMap, storeMap);
    const wallet = await VendorWallet.findOne({ vendorId: withdrawal.vendorId }).lean();

    res.status(200).json({
      success: true,
      data: { ...row, wallet },
    });
  } catch (e) {
    console.error("getWithdrawalById:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// PUT /api/admin/withdrawals/:id/approve
const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve — request is already ${withdrawal.status}`,
      });
    }

    const wallet = await VendorWallet.findOne({ vendorId: withdrawal.vendorId });
    if (!wallet) {
      return res.status(400).json({ success: false, message: "Vendor wallet not found" });
    }

    if (wallet.availableBalance < withdrawal.amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient vendor balance. Available: ETB ${wallet.availableBalance.toFixed(2)}`,
      });
    }

    wallet.availableBalance -= withdrawal.amount;
    wallet.withdrawnAmount += withdrawal.amount;
    await wallet.save();

    withdrawal.status = "PAID";
    withdrawal.adminNote = adminNote || "Approved and paid by admin";
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await WalletTransaction.findOneAndUpdate(
      { vendorId: withdrawal.vendorId, type: "WITHDRAWAL", reference: withdrawal._id.toString() },
      { status: "COMPLETED", description: "Withdrawal approved and paid" }
    );

    const { vendorMap, storeMap } = await loadVendorStoreMaps([withdrawal.vendorId]);
    const [row] = enrichWithdrawals([withdrawal.toObject()], vendorMap, storeMap);

    res.status(200).json({
      success: true,
      message: "Withdrawal approved and marked as paid",
      data: row,
    });
  } catch (e) {
    console.error("approveWithdrawal:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// PUT /api/admin/withdrawals/:id/reject
const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!adminNote?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject — request is already ${withdrawal.status}`,
      });
    }

    withdrawal.status = "REJECTED";
    withdrawal.adminNote = adminNote.trim();
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await WalletTransaction.findOneAndUpdate(
      { vendorId: withdrawal.vendorId, type: "WITHDRAWAL", reference: withdrawal._id.toString() },
      { status: "CANCELLED", description: `Rejected: ${adminNote.trim()}` }
    );

    const { vendorMap, storeMap } = await loadVendorStoreMaps([withdrawal.vendorId]);
    const [row] = enrichWithdrawals([withdrawal.toObject()], vendorMap, storeMap);

    res.status(200).json({
      success: true,
      message: "Withdrawal request rejected",
      data: row,
    });
  } catch (e) {
    console.error("rejectWithdrawal:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = {
  getAllWithdrawals,
  getWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal,
};
