const mongoose = require("mongoose");
const User = require("../../models/User");
const Store = require("../../models/Store");
const Product = require("../../models/Product");
const Order = require("../../models/Order");
const { VendorWallet } = require("../../models/VendorWallet");

function toObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

async function buildVendorStats(vendorIds) {
  const objectIds = vendorIds.map(toObjectId).filter(Boolean);

  const [stores, productCounts, orderStats, wallets] = await Promise.all([
    Store.find({ ownerId: { $in: vendorIds } }).lean(),
    Product.aggregate([
      { $match: { storeId: { $in: objectIds } } },
      {
        $group: {
          _id: "$storeId",
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { vendorId: { $in: objectIds }, paymentStatus: "paid" } },
      {
        $group: {
          _id: "$vendorId",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]),
    VendorWallet.find({ vendorId: { $in: vendorIds } }).lean(),
  ]);

  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.ownerId.toString()] = s;
  });

  const productMap = {};
  productCounts.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  const orderMap = {};
  orderStats.forEach((o) => {
    orderMap[o._id.toString()] = o;
  });

  const walletMap = {};
  wallets.forEach((w) => {
    walletMap[w.vendorId.toString()] = w;
  });

  return { storeMap, productMap, orderMap, walletMap };
}

function mapVendorRow(vendor, stats) {
  const id = vendor._id.toString();
  const store = stats.storeMap[id] || null;
  const products = stats.productMap[id] || {};
  const orders = stats.orderMap[id] || {};
  const wallet = stats.walletMap[id] || null;

  return {
    _id: id,
    userName: vendor.userName,
    email: vendor.email,
    role: vendor.role,
    joinedAt: vendor.createdAt,
    store: store
      ? {
          _id: store._id,
          storeName: store.storeName,
          slug: store.slug,
          status: store.status,
          businessCategory: store.businessCategory,
          logo: store.logo,
          city: store.city,
          phone: store.phone,
          email: store.email,
        }
      : null,
    stats: {
      totalProducts: products.totalProducts || 0,
      activeProducts: products.activeProducts || 0,
      totalOrders: orders.totalOrders || 0,
      totalRevenue: orders.totalRevenue || 0,
      availableBalance: wallet?.availableBalance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
    },
  };
}

// GET /api/admin/vendors
const getAllVendors = async (req, res) => {
  try {
    const { search, storeStatus = "all" } = req.query;

    const vendorQuery = { role: "vendor" };
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      const matchingStores = await Store.find({
        $or: [{ storeName: regex }, { slug: regex }],
      })
        .select("ownerId")
        .lean();
      const storeOwnerIds = matchingStores.map((s) => s.ownerId);

      vendorQuery.$or = [
        { userName: regex },
        { email: regex },
        ...(storeOwnerIds.length ? [{ _id: { $in: storeOwnerIds } }] : []),
      ];
    }

    const vendors = await User.find(vendorQuery)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const vendorIds = vendors.map((v) => v._id);
    const stats = await buildVendorStats(vendorIds);

    let rows = vendors.map((v) => mapVendorRow(v, stats));

    if (storeStatus === "active") {
      rows = rows.filter((v) => v.store?.status === "active");
    } else if (storeStatus === "temporarily-closed") {
      rows = rows.filter((v) => v.store?.status === "temporarily-closed");
    } else if (storeStatus === "no-store") {
      rows = rows.filter((v) => !v.store);
    }

    res.status(200).json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (e) {
    console.error("getAllVendors:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// GET /api/admin/vendors/:id
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await User.findOne({ _id: id, role: "vendor" })
      .select("-password")
      .lean();

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const stats = await buildVendorStats([vendor._id]);
    const row = mapVendorRow(vendor, stats);

    const store = await Store.findOne({ ownerId: vendor._id }).lean();
    const recentOrders = await Order.find({ vendorId: vendor._id })
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...row,
        store: store || null,
        recentOrders: recentOrders.map((o) => ({
          _id: o._id,
          orderId: o._id.toString().slice(-8).toUpperCase(),
          totalAmount: o.totalAmount,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          orderDate: o.orderDate,
        })),
      },
    });
  } catch (e) {
    console.error("getVendorById:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// PUT /api/admin/vendors/:id/store-status
const updateStoreStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ["active", "temporarily-closed"];
    if (!valid.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'temporarily-closed'",
      });
    }

    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const store = await Store.findOne({ ownerId: id });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "This vendor has not created a store yet",
      });
    }

    store.status = status;
    await store.save();

    res.status(200).json({
      success: true,
      message: `Store ${status === "active" ? "activated" : "closed temporarily"}`,
      data: { vendorId: id, storeStatus: store.status },
    });
  } catch (e) {
    console.error("updateStoreStatus:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = { getAllVendors, getVendorById, updateStoreStatus };

// ── PUT /api/admin/vendors/:id/account-status  (deactivate / reactivate) ──
const updateAccountStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!["active", "deactivated"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'active' or 'deactivated'" });
    }

    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    vendor.accountStatus = status;
    await vendor.save();

    if (status === "deactivated") {
      // Hide all products from marketplace
      await Product.updateMany({ storeId: id }, { status: "inactive" });
      // Close the store
      await Store.findOneAndUpdate({ ownerId: id }, { status: "temporarily-closed" });
    }

    res.status(200).json({
      success: true,
      message: status === "active"
        ? "Vendor account reactivated."
        : "Vendor deactivated. All products hidden from marketplace.",
    });
  } catch (e) {
    console.error("updateAccountStatus:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── DELETE /api/admin/vendors/:id ─────────────────────────────────────────
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const objectId = toObjectId(id);

    // Delete all products
    await Product.deleteMany({ storeId: objectId });

    // Orphan orders (keep for customer history)
    await Order.updateMany(
      { vendorId: objectId },
      { $set: { vendorId: null, vendorDeleted: true } }
    );

    // Delete store
    await Store.deleteOne({ ownerId: objectId });

    // Delete wallet data (ignore if missing)
    try {
      const {
        VendorWallet: WalletModel,
        WalletTransaction,
        WithdrawalRequest,
      } = require("../../models/VendorWallet");
      await WalletModel.deleteOne({ vendorId: objectId });
      await WalletTransaction.deleteMany({ vendorId: objectId });
      await WithdrawalRequest.deleteMany({ vendorId: objectId });
    } catch (_) {}

    // Soft-delete the user account
    vendor.accountStatus = "deleted";
    vendor.role          = "user";
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${vendor.userName} has been permanently deleted.`,
    });
  } catch (e) {
    console.error("deleteVendor:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── PUT /api/admin/vendors/:id/reset-password ─────────────────────────────
const resetVendorPassword = async (req, res) => {
  try {
    const { id }          = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const bcrypt = require("bcryptjs");
    vendor.password           = await bcrypt.hash(newPassword, 12);
    vendor.mustChangePassword = true;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Password for ${vendor.userName} has been reset. They will need to update it on next login.`,
    });
  } catch (e) {
    console.error("resetVendorPassword:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// Re-export with new actions
Object.assign(module.exports, {
  updateAccountStatus,
  deleteVendor,
  resetVendorPassword,
});
