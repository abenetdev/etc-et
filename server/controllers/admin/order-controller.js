const Order = require("../../models/Order");
const Store = require("../../models/Store");
const { releaseEscrowForOrder, rejectEscrowForOrder } = require("../vendor/wallet-controller");

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function mapOrderRow(order, storeNameMap) {
  const vid = order.vendorId?._id?.toString() || order.vendorId?.toString();
  return {
    ...order,
    orderId: order._id.toString().slice(-8).toUpperCase(),
    customerName: order.customerName || order.userId?.userName || "Guest",
    customerEmail: order.userId?.email || "",
    vendorName: storeNameMap[vid] || order.vendorId?.userName || "—",
  };
}

async function getStoreNameMap(vendorIds) {
  const stores = await Store.find({ ownerId: { $in: vendorIds } })
    .select("ownerId storeName")
    .lean();
  const map = {};
  stores.forEach((s) => {
    map[s.ownerId.toString()] = s.storeName;
  });
  return map;
}

// GET /api/admin/orders/get
const getAllOrdersOfAllUsers = async (req, res) => {
  try {
    const { status, paymentStatus, search, escrowPending } = req.query;

    const query = {};
    if (status && status !== "all") query.orderStatus = status;
    if (paymentStatus && paymentStatus !== "all") query.paymentStatus = paymentStatus;
    if (escrowPending === "true") {
      query.orderStatus = "delivered";
      query.paymentStatus = "paid";
      query.deliveryConfirmedByCustomer = true;
      query.escrowReleased = { $ne: true };
      query.escrowRejected = { $ne: true };
    }

    if (req.query.awaitingCustomer === "true") {
      query.orderStatus = "delivered";
      query.paymentStatus = "paid";
      query.deliveryConfirmedByCustomer = { $ne: true };
      query.escrowReleased = { $ne: true };
      query.escrowRejected = { $ne: true };
    }

    if (search?.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, "i");
      query.$or = [
        { customerName: regex },
        { paymentId: regex },
      ];
      if (/^[a-f\d]{6,24}$/i.test(term)) {
        query.$or.push({ _id: { $regex: term, $options: "i" } });
      }
    }

    const orders = await Order.find(query)
      .populate("userId", "userName email")
      .populate("vendorId", "userName email")
      .sort({ orderDate: -1 })
      .lean();

    const vendorIds = orders
      .map((o) => o.vendorId?._id || o.vendorId)
      .filter(Boolean);
    const storeNameMap = await getStoreNameMap(vendorIds);

    const mapped = orders.map((o) => mapOrderRow(o, storeNameMap));

    res.status(200).json({
      success: true,
      data: mapped,
      count: mapped.length,
    });
  } catch (e) {
    console.error("getAllOrdersOfAllUsers:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// GET /api/admin/orders/details/:id
const getOrderDetailsForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("userId", "userName email")
      .populate("vendorId", "userName email")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const vid = order.vendorId?._id || order.vendorId;
    const storeNameMap = vid
      ? await getStoreNameMap([vid])
      : {};

    res.status(200).json({
      success: true,
      data: mapOrderRow(order, storeNameMap),
    });
  } catch (e) {
    console.error("getOrderDetailsForAdmin:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// PUT /api/admin/orders/update/:id
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!VALID_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const existing = await Order.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    existing.orderStatus = orderStatus;
    existing.orderUpdateDate = new Date();
    await existing.save();

    const order = await Order.findById(id)
      .populate("userId", "userName email")
      .populate("vendorId", "userName email")
      .lean();

    const vid = order.vendorId?._id || order.vendorId;
    const storeNameMap = vid ? await getStoreNameMap([vid]) : {};

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: mapOrderRow(order, storeNameMap),
    });
  } catch (e) {
    console.error("updateOrderStatus:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// POST /api/admin/orders/release-escrow/:id
// Admin verifies delivery, then moves vendor share from escrow → available balance
const confirmEscrowRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot release escrow — payment is not completed",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Vendor must mark the order as delivered before funds can be released",
      });
    }

    if (!order.deliveryConfirmedByCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer must confirm delivery before funds can be released",
      });
    }

    if (order.escrowReleased) {
      return res.status(400).json({
        success: false,
        message: "Escrow for this order has already been released",
      });
    }

    if (order.escrowRejected) {
      return res.status(400).json({
        success: false,
        message: "Escrow release was already rejected for this order",
      });
    }

    const result = await releaseEscrowForOrder(order);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || result.reason || "Failed to release escrow",
      });
    }

    order.escrowReleased = true;
    order.escrowReleasedAt = new Date();
    order.escrowReleasedBy = adminId;
    await order.save();

    const populated = await Order.findById(id)
      .populate("userId", "userName email")
      .populate("vendorId", "userName email")
      .lean();

    const vid = populated.vendorId?._id || populated.vendorId;
    const storeNameMap = vid ? await getStoreNameMap([vid]) : {};

    res.status(200).json({
      success: true,
      message: "Delivery confirmed — vendor funds released to available balance",
      data: mapOrderRow(populated, storeNameMap),
    });
  } catch (e) {
    console.error("confirmEscrowRelease:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// POST /api/admin/orders/reject-escrow/:id
const rejectEscrowRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user.id;

    if (!adminNote?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject escrow — payment is not completed",
      });
    }

    if (order.escrowReleased) {
      return res.status(400).json({
        success: false,
        message: "Funds have already been released to the vendor",
      });
    }

    if (order.escrowRejected) {
      return res.status(400).json({
        success: false,
        message: "Escrow release was already rejected for this order",
      });
    }

    const result = await rejectEscrowForOrder(order, adminNote.trim());
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to reject escrow release",
      });
    }

    order.escrowRejected = true;
    order.escrowRejectionNote = adminNote.trim();
    order.escrowRejectedAt = new Date();
    order.escrowRejectedBy = adminId;
    await order.save();

    const populated = await Order.findById(id)
      .populate("userId", "userName email")
      .populate("vendorId", "userName email")
      .lean();

    const vid = populated.vendorId?._id || populated.vendorId;
    const storeNameMap = vid ? await getStoreNameMap([vid]) : {};

    res.status(200).json({
      success: true,
      message: "Escrow release rejected — vendor has been notified with your note",
      data: mapOrderRow(populated, storeNameMap),
    });
  } catch (e) {
    console.error("rejectEscrowRelease:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

module.exports = {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
  confirmEscrowRelease,
  rejectEscrowRelease,
};
