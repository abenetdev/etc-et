const mongoose = require("mongoose");
const { initializePayment, verifyPayment, verifyWebhookSignature } = require("../../helpers/chapa");
const Order   = require("../../models/Order");
const Cart    = require("../../models/Cart");
const Product = require("../../models/Product");
const { creditOrderEarnings } = require("../vendor/wallet-controller");

// ── Helpers ────────────────────────────────────────────────────────────────

function lineTotal(item) {
  return parseFloat(item.price) * item.quantity;
}

function groupItemsByVendor(items) {
  const groups = new Map();
  for (const item of items) {
    const vid = item.vendorId?.toString();
    if (!vid) continue;
    if (!groups.has(vid)) groups.set(vid, []);
    groups.get(vid).push(item);
  }
  return groups;
}

function buildCheckoutTxRef(orderGroupId) {
  return `checkout-${orderGroupId.toString()}-${Date.now()}`;
}

function parseTxRef(txRef) {
  if (!txRef) return { type: null };

  if (txRef.startsWith("checkout-")) {
    const parts = txRef.split("-");
    return { type: "group", orderGroupId: parts[1] };
  }

  if (txRef.startsWith("order-")) {
    const parts = txRef.split("-");
    return { type: "single", orderId: parts[1] };
  }

  return { type: null };
}

async function findOrdersForVerification({ orderGroupId, orderId }) {
  if (orderGroupId) {
    return Order.find({ orderGroupId }).sort({ createdAt: 1 });
  }

  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) return [];
    if (order.orderGroupId) {
      return Order.find({ orderGroupId: order.orderGroupId }).sort({ createdAt: 1 });
    }
    return [order];
  }

  return [];
}

async function confirmPaidOrders(orders, payerReference) {
  const alreadyPaid = orders.every((o) => o.paymentStatus === "paid");
  if (alreadyPaid) return { alreadyPaid: true };

  let cartIdToDelete = null;

  for (const order of orders) {
    if (order.paymentStatus === "paid") continue;

    order.paymentStatus   = "paid";
    order.orderStatus     = "confirmed";
    order.payerId         = payerReference || "";
    order.orderUpdateDate = new Date();

    for (const item of order.cartItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      const qty = item.quantity;
      product.stock      = Math.max(0, (product.stock      ?? 0) - qty);
      product.totalStock = Math.max(0, (product.totalStock ?? 0) - qty);
      await product.save();
    }

    await order.save();

    const vendorTotal = order.cartItems.reduce((sum, item) => sum + lineTotal(item), 0);
    if (order.vendorId && vendorTotal > 0) {
      await creditOrderEarnings(order.vendorId.toString(), vendorTotal, order._id.toString());
    }

    if (order.cartId) cartIdToDelete = order.cartId;
  }

  if (cartIdToDelete) {
    await Cart.findByIdAndDelete(cartIdToDelete);
  }

  return { alreadyPaid: false };
}

async function cancelOrders(orders) {
  for (const order of orders) {
    order.orderStatus     = "cancelled";
    order.paymentStatus = "failed";
    order.orderUpdateDate = new Date();
    await order.save();
  }
}

// ── POST /api/shop/order/create ───────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const {
      userId, cartItems, addressInfo, totalAmount,
      cartId, customerEmail, customerFirstName, customerLastName,
    } = req.body;

    if (!userId || !cartItems?.length || totalAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId, cartItems, and totalAmount are required",
      });
    }

    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.productId).select("storeId").lean();
        return {
          ...item,
          vendorId: product?.storeId || null,
        };
      })
    );

    const itemsWithoutVendor = enrichedItems.filter((item) => !item.vendorId);
    if (itemsWithoutVendor.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some products are not linked to a vendor store",
      });
    }

    const vendorGroups = groupItemsByVendor(enrichedItems);
    const computedTotal = enrichedItems.reduce((sum, item) => sum + lineTotal(item), 0);

    if (Math.abs(computedTotal - Number(totalAmount)) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Order total mismatch. Please refresh and try again.",
      });
    }

    const orderGroupId = new mongoose.Types.ObjectId();
    const customerName =
      `${customerFirstName || ""} ${customerLastName || ""}`.trim() || "Customer";

    const createdOrders = [];

    for (const [vendorId, items] of vendorGroups.entries()) {
      const vendorTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

      const order = new Order({
        userId,
        vendorId,
        orderGroupId,
        cartId,
        cartItems: items,
        addressInfo,
        orderStatus:   "pending",
        paymentMethod: "chapa",
        paymentStatus: "pending",
        totalAmount:   vendorTotal,
        orderDate:       new Date(),
        orderUpdateDate: new Date(),
        customerName,
      });

      await order.save();
      createdOrders.push(order);
    }

    const txRef = buildCheckoutTxRef(orderGroupId);
    await Order.updateMany({ orderGroupId }, { paymentId: txRef });

    const chapaData = await initializePayment({
      amount:      totalAmount,
      email:       customerEmail     || "customer@example.com",
      firstName:   customerFirstName || "Customer",
      lastName:    customerLastName  || "",
      txRef,
      description: createdOrders.length > 1
        ? `Checkout (${createdOrders.length} stores) #${orderGroupId.toString().slice(-6)}`
        : `Order #${createdOrders[0]._id.toString().slice(-6)}`,
    });

    if (chapaData.status !== "success") {
      await cancelOrders(createdOrders);
      return res.status(502).json({
        success: false,
        message: "Chapa payment initialization failed",
        detail:  chapaData,
      });
    }

    res.status(201).json({
      success:      true,
      checkoutUrl:  chapaData.data.checkout_url,
      orderGroupId: orderGroupId.toString(),
      orderId:      createdOrders[0]._id,
      orderIds:     createdOrders.map((o) => o._id),
      txRef,
    });
  } catch (e) {
    console.error("createOrder error:", e.response?.data || e.message);
    res.status(500).json({ success: false, message: e.message || "Something went wrong" });
  }
};

// ── POST /api/shop/order/verify ───────────────────────────────────────────
const verifyOrder = async (req, res) => {
  try {
    const { txRef, orderId, orderGroupId } = req.body;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: "txRef is required",
      });
    }

    const orders = await findOrdersForVerification({ orderGroupId, orderId });
    if (!orders.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (orders.every((o) => o.paymentStatus === "paid")) {
      return res.status(200).json({
        success: true,
        message: "Order already confirmed",
        data:    orders,
      });
    }

    const verifyData = await verifyPayment(txRef);
    const paid = verifyData.status === "success" &&
                 verifyData.data?.status === "success";

    if (!paid) {
      await cancelOrders(orders.filter((o) => o.paymentStatus !== "paid"));
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
        detail:  verifyData,
      });
    }

    await confirmPaidOrders(orders, verifyData.data?.reference || "");

    res.status(200).json({
      success: true,
      message: orders.length > 1
        ? `${orders.length} vendor orders confirmed successfully`
        : "Order confirmed successfully",
      data: orders,
    });
  } catch (e) {
    console.error("verifyOrder error:", e.response?.data || e.message);
    res.status(500).json({
      success: false,
      message: e.message || "Something went wrong",
    });
  }
};

// ── POST /api/shop/order/chapa-webhook ────────────────────────────────────
const chapaWebhook = async (req, res) => {
  try {
    const { trx_ref, status } = req.body;
    const signature = req.headers["x-chapa-signature"];

    console.log("Chapa webhook received:", req.body);

    // Verify webhook signature
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return res.status(401).json({ success: false, message: "Invalid signature" });
      }
    }

    if (!trx_ref) {
      return res.status(400).json({ success: false, message: "No trx_ref" });
    }

    const parsed = parseTxRef(trx_ref);
    let orders = [];

    if (parsed.type === "group") {
      orders = await Order.find({ orderGroupId: parsed.orderGroupId });
    } else if (parsed.type === "single") {
      const order = await Order.findById(parsed.orderId);
      if (order) {
        orders = order.orderGroupId
          ? await Order.find({ orderGroupId: order.orderGroupId })
          : [order];
      }
    }

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (status === "success") {
      await confirmPaidOrders(orders, trx_ref);
      console.log(`Checkout ${parsed.orderGroupId || parsed.orderId} confirmed via webhook`);
    } else if (status === "failed" || status === "cancelled") {
      await cancelOrders(orders.filter((o) => o.paymentStatus !== "paid"));
      console.log(`Checkout ${parsed.orderGroupId || parsed.orderId} cancelled via webhook`);
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("chapaWebhook error:", e.message);
    res.status(200).json({ success: false, message: e.message });
  }
};

// ── GET /api/shop/order/list/:userId ──────────────────────────────────────
const getAllOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ orderDate: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Some error occurred" });
  }
};

// ── GET /api/shop/order/details/:id ───────────────────────────────────────
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Some error occurred" });
  }
};

// ── POST /api/shop/order/confirm-delivery/:id ─────────────────────────────
const confirmDeliveryByCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not your order" });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "You can only confirm delivery for paid orders",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Vendor must mark the order as delivered before you can confirm receipt",
      });
    }

    if (order.deliveryConfirmedByCustomer) {
      return res.status(400).json({
        success: false,
        message: "You have already confirmed delivery for this order",
      });
    }

    if (order.escrowReleased) {
      return res.status(400).json({
        success: false,
        message: "Funds for this order have already been released",
      });
    }

    order.deliveryConfirmedByCustomer = true;
    order.deliveryConfirmedAt = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: "Thank you! Your confirmation has been recorded. The vendor will be paid after admin review.",
      data: order,
    });
  } catch (e) {
    console.error("confirmDeliveryByCustomer:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createOrder,
  verifyOrder,
  chapaWebhook,
  getAllOrdersByUser,
  getOrderDetails,
  confirmDeliveryByCustomer,
};
