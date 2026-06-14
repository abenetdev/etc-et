/**
 * Split legacy combined orders (multiple vendors in one order doc)
 * into separate per-vendor order documents.
 *
 * Run once: node scripts/split-legacy-orders.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");

function lineTotal(item) {
  return parseFloat(item.price) * item.quantity;
}

async function splitLegacyOrders() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const orders = await Order.find({});
  let splitCount = 0;

  for (const order of orders) {
    const vendorIds = [
      ...new Set(
        (order.cartItems || [])
          .map((item) => item.vendorId?.toString())
          .filter(Boolean)
      ),
    ];

    if (vendorIds.length <= 1) continue;

    console.log(`Splitting order ${order._id} (${vendorIds.length} vendors)`);

    const orderGroupId = order.orderGroupId || order._id;
    const base = order.toObject();
    delete base._id;
    delete base.__v;

    await Order.deleteOne({ _id: order._id });

    for (const vendorId of vendorIds) {
      const items = (order.cartItems || []).filter(
        (item) => item.vendorId?.toString() === vendorId
      );
      const vendorTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

      await Order.create({
        ...base,
        vendorId,
        orderGroupId,
        cartItems: items,
        totalAmount: vendorTotal,
      });
    }

    splitCount += 1;
  }

  console.log(`Split ${splitCount} legacy combined order(s).`);
  await mongoose.disconnect();
}

splitLegacyOrders().catch((e) => {
  console.error(e);
  process.exit(1);
});
