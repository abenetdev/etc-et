/**
 * Backfill missing storeId on products and vendorId on orders.
 * Run once: node scripts/backfill-vendor-ids.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const vendors = await User.find({ role: "vendor" }).select("_id email").lean();
  if (vendors.length === 0) {
    console.log("No vendors found — nothing to backfill.");
    return;
  }

  const defaultVendorId = vendors[0]._id;
  console.log(`Using default vendor: ${vendors[0].email} (${defaultVendorId})`);

  const orphanProducts = await Product.find({
    $or: [{ storeId: { $exists: false } }, { storeId: null }],
  });

  let productUpdates = 0;
  for (const product of orphanProducts) {
    product.storeId = defaultVendorId;
    await product.save();
    productUpdates += 1;
    console.log(`  product ${product._id} → storeId ${defaultVendorId}`);
  }
  console.log(`Updated ${productUpdates} product(s)`);

  const orders = await Order.find({});
  let orderUpdates = 0;

  for (const order of orders) {
    let changed = false;

    for (const item of order.cartItems || []) {
      if (item.vendorId) continue;
      const product = await Product.findById(item.productId).select("storeId").lean();
      const vid = product?.storeId || defaultVendorId;
      if (vid) {
        item.vendorId = vid;
        changed = true;
      }
    }

    if (!order.vendorId) {
      const fromItem = order.cartItems?.find((i) => i.vendorId)?.vendorId;
      order.vendorId = fromItem || defaultVendorId;
      changed = true;
    }

    if (changed) {
      await order.save();
      orderUpdates += 1;
      console.log(`  order ${order._id} → vendorId ${order.vendorId}`);
    }
  }

  console.log(`Updated ${orderUpdates} order(s)`);
  console.log("Backfill complete.");
}

backfill()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  });
