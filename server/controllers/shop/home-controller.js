const Product = require("../../models/Product");
const Store   = require("../../models/Store");
const { normaliseProduct } = require("./products-controller");

// ── GET /api/shop/home ────────────────────────────────────────────────────
const getHomeData = async (req, res) => {
  try {
    // Run all queries in parallel
    const [newArrivals, trendingProducts, popularStores] = await Promise.all([
      // New Arrivals — 8 most recently added active products
      Product.find({ status: "active" })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // Trending — 8 products with highest averageReview (or just newest for now)
      Product.find({ status: "active" })
        .sort({ averageReview: -1, createdAt: -1 })
        .limit(8)
        .lean(),

      // Popular Stores — active stores, newest first, max 6
      Store.find({ status: "active" })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    // Count products per store
    const storeIds = popularStores.map((s) => s.ownerId);
    const productCounts = await Product.aggregate([
      { $match: { storeId: { $in: storeIds }, status: "active" } },
      { $group: { _id: "$storeId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    productCounts.forEach((p) => {
      countMap[p._id.toString()] = p.count;
    });

    const storesWithCount = popularStores.map((store) => ({
      ...store,
      productCount: countMap[store.ownerId.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        newArrivals:     newArrivals.map(normaliseProduct),
        trendingProducts: trendingProducts.map(normaliseProduct),
        popularStores:   storesWithCount,
      },
    });
  } catch (e) {
    console.error("getHomeData error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getHomeData };
