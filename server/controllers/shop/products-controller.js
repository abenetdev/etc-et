const Product = require("../../models/Product");
const Store = require("../../models/Store");

const getFilteredProducts = async (req, res) => {
  try {
    const { category = [], brand = [], sortBy = "price-lowtohigh" } = req.query;

    // Only show active products on the shop side
    let filters = { status: "active" };

    if (category.length) {
      filters.category = { $in: category.split(",") };
    }

    if (brand.length) {
      filters.brand = { $in: brand.split(",") };
    }

    let sort = {};
    switch (sortBy) {
      case "price-lowtohigh":  sort.price = 1;  break;
      case "price-hightolow":  sort.price = -1; break;
      case "title-atoz":       sort.title = 1;  break;
      case "title-ztoa":       sort.title = -1; break;
      default:                 sort.price = 1;  break;
    }

    const products = await Product.find(filters).sort(sort).lean();

    // Normalise each product so the front-end always gets consistent fields
    const normalised = products.map(normaliseProduct);

    res.status(200).json({ success: true, data: normalised });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Some error occured" });
  }
};

const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();

    if (!product || product.status !== "active") {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    let store = null;
    if (product.storeId) {
      store = await Store.findOne({ ownerId: product.storeId })
        .select("storeName slug logo businessCategory description status")
        .lean();
      if (store?.status !== "active") store = null;
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      status: "active",
      category: product.category,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...normaliseProduct(product),
        store: store
          ? {
              storeName: store.storeName,
              slug: store.slug,
              logo: store.logo,
              businessCategory: store.businessCategory,
              description: store.description,
            }
          : null,
        relatedProducts: relatedProducts.map(normaliseProduct),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Some error occured" });
  }
};

// ── Normaliser: maps new vendor fields → legacy shop fields ───────────────
function normaliseProduct(p) {
  return {
    ...p,
    // title → use name if title is missing
    title:      p.name  || p.title  || "",
    name:       p.name  || p.title  || "",
    // image → use first element of images[] if image is missing
    image:      (p.images && p.images.length > 0) ? p.images[0] : (p.image || ""),
    images:     (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []),
    // stock / totalStock
    totalStock: p.stock !== undefined ? p.stock : (p.totalStock || 0),
    stock:      p.stock !== undefined ? p.stock : (p.totalStock || 0),
  };
}

module.exports = { getFilteredProducts, getProductDetails, normaliseProduct };
