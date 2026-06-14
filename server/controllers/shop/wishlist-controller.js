const Wishlist = require("../../models/Wishlist");
const Product = require("../../models/Product");

function resolveProductFields(product) {
  const title = product.name || product.title || "Unknown Product";
  const image =
    product.images?.length > 0 ? product.images[0] : product.image || "";
  const stock =
    product.stock !== undefined ? product.stock : product.totalStock || 0;
  const price = product.price ?? 0;
  const salePrice = product.salePrice ?? 0;
  return { title, image, stock, price, salePrice };
}

async function populateWishlistItems(wishlist) {
  const populated = [];
  for (const item of wishlist.items) {
    const product = await Product.findById(item.productId).lean();
    if (!product) continue;
    const fields = resolveProductFields(product);
    populated.push({
      productId: product._id,
      addedAt: item.addedAt,
      ...fields,
      category: product.category,
      brand: product.brand,
    });
  }
  return populated;
}

const getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    const items = await populateWishlistItems(wishlist);
    res.status(200).json({ success: true, data: { items, count: items.length } });
  } catch (e) {
    console.error("getWishlist:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    const exists = wishlist.items.some(
      (i) => i.productId.toString() === productId
    );
    if (exists) {
      return res.status(400).json({ success: false, message: "Already in wishlist" });
    }

    wishlist.items.push({ productId });
    await wishlist.save();

    const items = await populateWishlistItems(wishlist);
    res.status(200).json({ success: true, message: "Added to wishlist", data: { items, count: items.length } });
  } catch (e) {
    console.error("addToWishlist:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    wishlist.items = wishlist.items.filter(
      (i) => i.productId.toString() !== productId
    );
    await wishlist.save();

    const items = await populateWishlistItems(wishlist);
    res.status(200).json({ success: true, message: "Removed from wishlist", data: { items, count: items.length } });
  } catch (e) {
    console.error("removeFromWishlist:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
