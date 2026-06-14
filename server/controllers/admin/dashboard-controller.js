const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Store = require("../../models/Store");
const {
  WithdrawalRequest,
  WalletTransaction,
} = require("../../models/VendorWallet");

function startOf(unit) {
  const d = new Date();
  if (unit === "day") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "week") {
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return d;
}

function paidRevenue(orders) {
  return orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
}

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [
      allOrders,
      allProducts,
      vendors,
      customers,
      stores,
      pendingWithdrawals,
      commissionAgg,
      recentOrders,
    ] = await Promise.all([
      Order.find({}).lean(),
      Product.find({}).lean(),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "user" }),
      Store.find({}).lean(),
      WithdrawalRequest.countDocuments({ status: "PENDING" }),
      WalletTransaction.aggregate([
        { $match: { type: "COMMISSION", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
      ]),
      Order.find({})
        .sort({ orderDate: -1 })
        .limit(8)
        .populate("userId", "userName email")
        .populate("vendorId", "userName email")
        .lean(),
    ]);

    const paidOrders = allOrders.filter((o) => o.paymentStatus === "paid");
    const totalRevenue = paidRevenue(allOrders);

    const orderStatusSummary = {
      pending:    allOrders.filter((o) => o.orderStatus === "pending").length,
      confirmed:  allOrders.filter((o) => o.orderStatus === "confirmed").length,
      processing: allOrders.filter((o) => o.orderStatus === "processing").length,
      shipped:    allOrders.filter((o) => o.orderStatus === "shipped").length,
      delivered:  allOrders.filter((o) => o.orderStatus === "delivered").length,
      cancelled:  allOrders.filter((o) => o.orderStatus === "cancelled").length,
    };

    const salesPerformance = {
      today:    paidRevenue(paidOrders.filter((o) => new Date(o.orderDate) >= startOf("day"))),
      thisWeek: paidRevenue(paidOrders.filter((o) => new Date(o.orderDate) >= startOf("week"))),
      thisMonth: paidRevenue(paidOrders.filter((o) => new Date(o.orderDate) >= startOf("month"))),
    };

    // Top vendors by paid order revenue
    const vendorRevenueMap = {};
    for (const order of paidOrders) {
      const vid = order.vendorId?._id?.toString() || order.vendorId?.toString();
      if (!vid) continue;
      if (!vendorRevenueMap[vid]) {
        vendorRevenueMap[vid] = { vendorId: vid, orderCount: 0, revenue: 0 };
      }
      vendorRevenueMap[vid].orderCount += 1;
      vendorRevenueMap[vid].revenue += order.totalAmount || 0;
    }

    const storeNameMap = {};
    stores.forEach((s) => {
      storeNameMap[s.ownerId?.toString()] = s.storeName;
    });

    const topVendors = Object.values(vendorRevenueMap)
      .map((v) => ({
        ...v,
        storeName: storeNameMap[v.vendorId] || "Unnamed Store",
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrdersMapped = recentOrders.map((o) => {
      const vid = o.vendorId?._id?.toString() || o.vendorId?.toString();
      return {
      _id:          o._id,
      orderId:      o._id.toString().slice(-8).toUpperCase(),
      customerName: o.customerName || o.userId?.userName || "Guest",
      vendorName:   storeNameMap[vid] || o.vendorId?.userName || "—",
      totalAmount:  o.totalAmount,
      orderStatus:  o.orderStatus,
      paymentStatus: o.paymentStatus,
      orderDate:    o.orderDate,
    };
    });

    const notifications = [];
    if (pendingWithdrawals > 0) {
      notifications.push({
        id: "pending-withdrawals",
        type: "wallet",
        level: "warning",
        message: `${pendingWithdrawals} withdrawal request${pendingWithdrawals > 1 ? "s" : ""} awaiting review.`,
      });
    }
    if (orderStatusSummary.pending > 0) {
      notifications.push({
        id: "pending-orders",
        type: "order",
        level: "info",
        message: `${orderStatusSummary.pending} order${orderStatusSummary.pending > 1 ? "s" : ""} pending confirmation.`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalOrders:     allOrders.length,
          paidOrders:      paidOrders.length,
          totalVendors:    vendors,
          totalCustomers:  customers,
          totalProducts:   allProducts.length,
          activeStores:    stores.filter((s) => s.status === "active").length,
          pendingWithdrawals,
          platformCommission: commissionAgg[0]?.total || 0,
        },
        salesPerformance,
        orderStatusSummary,
        topVendors,
        recentOrders: recentOrdersMapped,
        notifications,
      },
    });
  } catch (e) {
    console.error("admin getDashboard:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = { getDashboard };
