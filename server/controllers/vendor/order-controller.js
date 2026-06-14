const Order = require("../../models/Order");
const { getUserId, vendorOrderFilter } = require("../../helpers/vendor");

// ── GET /api/vendor/orders/get ─────────────────────────────────────────────
const getAllOrdersOfAllUsers = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { status, search, startDate, endDate } = req.query;

    const andConditions = [vendorOrderFilter(vendorId)];

    if (status && status !== "all") {
      andConditions.push({ orderStatus: status });
    }

    if (startDate && endDate) {
      andConditions.push({
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });
    }

    const query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    const orders = await Order.find(query)
      .populate("userId", "userName email")
      .sort({ orderDate: -1 })
      .lean();

    const mapped = orders.map((o) => ({
      ...o,
      customerName: o.customerName || o.userId?.userName || "Guest",
    }));

    res.status(200).json({ success: true, data: mapped, count: mapped.length });
  } catch (e) {
    console.error("getAllOrdersOfAllUsers:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── GET /api/vendor/orders/details/:id ────────────────────────────────────
const getOrderDetailsForVendor = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { id }   = req.params;

    const order = await Order.findOne({ _id: id, ...vendorOrderFilter(vendorId) })
      .populate("userId", "userName email")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        ...order,
        customerName: order.customerName || order.userId?.userName || "Guest",
      },
    });
  } catch (e) {
    console.error("getOrderDetailsForVendor:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── PUT /api/vendor/orders/update/:id ─────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { id }       = req.params;
    const { orderStatus } = req.body;

    const valid = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!valid.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findOne({ _id: id, ...vendorOrderFilter(vendorId) });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.orderStatus     = orderStatus;
    order.orderUpdateDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message:
        orderStatus === "delivered"
          ? "Marked as delivered — awaiting admin verification to release funds"
          : "Order status updated",
      data: order,
    });
  } catch (e) {
    console.error("updateOrderStatus:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── GET /api/vendor/orders/stats ──────────────────────────────────────────
const getOrderStats = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const vendorMatch = vendorOrderFilter(vendorId);

    const [stats, totalOrders, revenueAgg] = await Promise.all([
      Order.aggregate([
        { $match: vendorMatch },
        { $group: { _id: "$orderStatus", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments(vendorMatch),
      Order.aggregate([
        { $match: { $and: [vendorMatch, { orderStatus: "delivered" }] } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
    });
  } catch (e) {
    console.error("getOrderStats:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = { getAllOrdersOfAllUsers, getOrderDetailsForVendor, updateOrderStatus, getOrderStats };
