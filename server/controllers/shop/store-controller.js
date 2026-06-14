const Store   = require("../../models/Store");
const Product = require("../../models/Product");
const mongoose = require("mongoose");
const { normaliseProduct } = require("./products-controller");

// ── GET /api/shop/store/:slug ──────────────────────────────────────────────
const getStoreBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const store = await Store.findOne({ slug, status: "active" }).lean();

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const ownerIdStr = store.ownerId?.toString();

    // Build a flexible query that matches whether storeId was stored
    // as ObjectId OR as a string (handles legacy data)
    let ownerObjectId = null;
    try {
      ownerObjectId = new mongoose.Types.ObjectId(ownerIdStr);
    } catch (_) {
      // not a valid ObjectId string — fall through
    }

    const storeIdQuery = ownerObjectId
      ? { $or: [{ storeId: ownerObjectId }, { storeId: ownerIdStr }] }
      : { storeId: ownerIdStr };

    const products = await Product.find({
      ...storeIdQuery,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `[store/${slug}] ownerId=${ownerIdStr}, products found=${products.length}`
    );

    res.status(200).json({
      success: true,
      data: {
        store,
        products:     products.map(normaliseProduct),
        productCount: products.length,
      },
    });
  } catch (e) {
    console.error("getStoreBySlug:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── GET /api/shop/store (list all active stores) ───────────────────────────
const getAllStores = async (req, res) => {
  try {
    const stores = await Store.find({ status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    const storeOwnerIds = stores.map((s) =>
      typeof s.ownerId === "string" ? new mongoose.Types.ObjectId(s.ownerId) : s.ownerId
    );

    const counts = await Product.aggregate([
      { $match: { storeId: { $in: storeOwnerIds }, status: "active" } },
      { $group: { _id: "$storeId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const storesWithCount = stores.map((s) => ({
      ...s,
      productCount: countMap[s.ownerId?.toString()] || 0,
    }));

    res.status(200).json({ success: true, data: storesWithCount });
  } catch (e) {
    console.error("getAllStores:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getStoreBySlug, getAllStores };

// ── Debug: GET /api/shop/store/:slug/debug ────────────────────────────────
// Remove this after confirming products show correctly
async function debugStore(req, res) {
  try {
    const { slug } = req.params;
    const Store   = require("../../models/Store");
    const Product = require("../../models/Product");

    const store = await Store.findOne({ slug }).lean();
    if (!store) return res.json({ error: "store not found" });

    const ownerStr = store.ownerId?.toString();
    const allProducts = await Product.find({}).select("name storeId status").lean();
    const matching = allProducts.filter(
      (p) => p.storeId?.toString() === ownerStr
    );

    res.json({
      store_ownerId:   ownerStr,
      total_products:  allProducts.length,
      matching_products: matching.length,
      sample: matching.slice(0, 3).map(p => ({ name: p.name, storeId: p.storeId?.toString(), status: p.status })),
      mismatched_sample: allProducts
        .filter(p => p.storeId?.toString() !== ownerStr)
        .slice(0, 3)
        .map(p => ({ name: p.name, storeId: p.storeId?.toString() || "NULL" })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
module.exports.debugStore = debugStore;
