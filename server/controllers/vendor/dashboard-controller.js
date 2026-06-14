const Order = require("../../models/Order");
const Product = require("../../models/Product");
const { VendorWallet } = require("../../models/VendorWallet");
const Store = require("../../models/Store");
const { getUserId, vendorProductFilter, vendorOrderFilter } = require("../../helpers/vendor");

// ── helpers ────────────────────────────────────────────────────────────────

function startOf(unit) {
  const d = new Date();
  if (unit === "day")   { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week")  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
  if (unit === "month") { d.setDate(1); d.setHours(0,0,0,0); return d; }
  return d;
}

// ── GET /api/vendor/dashboard ──────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const vq = vendorOrderFilter(vendorId);
    const productFilter = vendorProductFilter(vendorId);

    // ── 1. Fetch all data in parallel ──────────────────────────────────────
    const [allOrders, allProducts, wallet, store] = await Promise.all([
      Order.find(vq).lean(),
      Product.find(productFilter).lean(),
      VendorWallet.findOne({ vendorId }).lean(),
      Store.findOne({ ownerId: vendorId }).lean(),
    ]);

    const totalRevenue  = allOrders
      .filter(o => o.orderStatus === "delivered")
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const totalOrders   = allOrders.length;
    const activeProducts = allProducts.filter(p => p.status === "active").length;
    const availableBalance = wallet?.availableBalance || 0;
    const pendingOrders = allOrders.filter(o => o.orderStatus === "pending").length;

    const uniqueCustomers = new Set(
      allOrders.map(o => o.userId?.toString()).filter(Boolean)
    ).size;

    // ── 2. Sales performance ───────────────────────────────────────────────
    const now = new Date();
    const todayRevenue = allOrders
      .filter(o => o.orderStatus === "delivered" && new Date(o.orderDate) >= startOf("day"))
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const weekRevenue = allOrders
      .filter(o => o.orderStatus === "delivered" && new Date(o.orderDate) >= startOf("week"))
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const monthRevenue = allOrders
      .filter(o => o.orderStatus === "delivered" && new Date(o.orderDate) >= startOf("month"))
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    // ── 3. Order status summary ────────────────────────────────────────────
    const orderStatusSummary = {
      pending:    allOrders.filter(o => o.orderStatus === "pending").length,
      processing: allOrders.filter(o => o.orderStatus === "processing").length,
      shipped:    allOrders.filter(o => o.orderStatus === "shipped").length,
      delivered:  allOrders.filter(o => o.orderStatus === "delivered").length,
      cancelled:  allOrders.filter(o => o.orderStatus === "cancelled").length,
    };

    // ── 4. Recent orders (latest 5) ────────────────────────────────────────
    const recentOrders = await Order.find(vq)
      .sort({ orderDate: -1 })
      .limit(5)
      .populate("userId", "userName email")
      .lean();

    const recentOrdersMapped = recentOrders.map(o => ({
      _id:          o._id,
      orderId:      o._id.toString().slice(-8).toUpperCase(),
      customerName: o.customerName || o.userId?.userName || "Guest",
      totalAmount:  o.totalAmount,
      orderStatus:  o.orderStatus,
      orderDate:    o.orderDate,
    }));

    // ── 5. Top selling products ────────────────────────────────────────────
    const productSalesMap = {};
    allOrders
      .filter(o => o.orderStatus === "delivered")
      .forEach(order => {
        (order.cartItems || []).forEach(item => {
          const pid = item.productId?.toString();
          if (!pid) return;
          if (!productSalesMap[pid]) {
            productSalesMap[pid] = { productId: pid, title: item.title, image: item.image, unitsSold: 0, revenue: 0 };
          }
          productSalesMap[pid].unitsSold += (item.quantity || 0);
          productSalesMap[pid].revenue   += (parseFloat(item.price) || 0) * (item.quantity || 0);
        });
      });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ── 6. Low stock alerts (stock < 5) ───────────────────────────────────
    const lowStockProducts = allProducts
      .filter(p => p.stock < 5 && p.status === "active")
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
      .map(p => ({
        _id:   p._id,
        name:  p.name || p.title,
        stock: p.stock,
        image: p.images?.[0] || p.image || "",
      }));

    // ── 7. Wallet summary ──────────────────────────────────────────────────
    const walletSummary = {
      totalRevenue:     wallet?.totalRevenue     || 0,
      availableBalance: wallet?.availableBalance || 0,
      pendingBalance:   wallet?.pendingBalance   || 0,
      withdrawnAmount:  wallet?.withdrawnAmount  || 0,
    };

    // ── 8. Recent activities ───────────────────────────────────────────────
    const recentActivities = [];

    // Last 5 orders as activities
    recentOrders.forEach(o => {
      recentActivities.push({
        id:        o._id,
        type:      "order",
        message:   `New order received from ${o.customerName || "customer"}`,
        timestamp: o.orderDate || o.createdAt,
        status:    o.orderStatus,
      });
    });

    // Last 5 products created as activities
    const recentProducts = await Product.find(productFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentProducts.forEach(p => {
      recentActivities.push({
        id:        p._id,
        type:      "product",
        message:   `Product "${p.name || p.title}" was added`,
        timestamp: p.createdAt,
        status:    p.status,
      });
    });

    // Sort by timestamp
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // ── 9. Notifications ───────────────────────────────────────────────────
    const notifications = [];

    if (pendingOrders > 0) {
      notifications.push({
        id:      "notif-pending-orders",
        type:    "order",
        message: `You have ${pendingOrders} pending order${pendingOrders > 1 ? "s" : ""} waiting for processing.`,
        level:   "warning",
      });
    }

    if (lowStockProducts.length > 0) {
      notifications.push({
        id:      "notif-low-stock",
        type:    "stock",
        message: `${lowStockProducts.length} product${lowStockProducts.length > 1 ? "s are" : " is"} running low on stock.`,
        level:   "warning",
      });
    }

    if (!store || !store.storeName) {
      notifications.push({
        id:      "notif-incomplete-profile",
        type:    "store",
        message: "Your store profile is incomplete. Update your store settings.",
        level:   "info",
      });
    }

    if (wallet && wallet.availableBalance > 0) {
      notifications.push({
        id:      "notif-withdrawal",
        type:    "wallet",
        message: `ETB ${wallet.availableBalance.toFixed(2)} is available for withdrawal.`,
        level:   "info",
      });
    }

    // ── 10. Store performance (placeholder — real analytics need tracking) ─
    const storePerformance = {
      storeViews:      0,
      productViews:    0,
      conversionRate:  totalOrders > 0 ? ((allOrders.filter(o => o.orderStatus === "delivered").length / totalOrders) * 100).toFixed(1) : "0.0",
    };

    // ── Compose response ───────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        // Store info for header
        storeName:  store?.storeName || "My Store",
        storeStatus: store?.status || "active",

        // Overview cards
        overview: {
          totalRevenue,
          totalOrders,
          activeProducts,
          availableBalance,
          pendingOrders,
          uniqueCustomers,
        },

        // Sales performance
        salesPerformance: {
          today: todayRevenue,
          thisWeek: weekRevenue,
          thisMonth: monthRevenue,
        },

        // Recent orders
        recentOrders: recentOrdersMapped,

        // Top selling
        topProducts,

        // Low stock
        lowStockProducts,

        // Order breakdown
        orderStatusSummary,

        // Wallet
        walletSummary,

        // Store performance
        storePerformance,

        // Timeline
        recentActivities: recentActivities.slice(0, 10),

        // Alerts
        notifications,
      },
    });
  } catch (e) {
    console.error("getDashboard error:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = { getDashboard };
