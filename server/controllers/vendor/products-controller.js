const { imageUploadUtil } = require("../../helpers/cloudinary");
const { getUserId, vendorProductFilter } = require("../../helpers/vendor");
const Product = require("../../models/Product");

function normalizeVendorProduct(p) {
  return {
    ...p,
    name: p.name || p.title || "",
    images:
      p.images?.length > 0 ? p.images : p.image ? [p.image] : [],
    stock: p.stock !== undefined ? p.stock : p.totalStock ?? 0,
  };
}

// ── Image Upload ───────────────────────────────────────────────────────────
const handleImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const url  = "data:" + req.file.mimetype + ";base64," + b64;
    const result = await imageUploadUtil(url);
    res.json({ success: true, result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
};

// ── Add Product ────────────────────────────────────────────────────────────
const addProduct = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { name, description, price, salePrice, stock, category, brand, images, status } = req.body;

    if (!name || !description || price === undefined || stock === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: "name, description, price, stock and category are required",
      });
    }

    const newProduct = new Product({
      storeId:    vendorId,
      name,
      description,
      price:      Number(price),
      salePrice:  Number(salePrice) || 0,
      stock:      Number(stock),
      category,
      brand:      brand || "",
      images:     images || [],
      status:     status || "active",
      // keep legacy fields in sync (pre-save hook also does this)
      title:      name,
      totalStock: Number(stock),
      image:      images?.[0] || "",
    });

    await newProduct.save();

    res.status(201).json({ success: true, data: newProduct, message: "Product created" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error creating product", error: e.message });
  }
};

// ── Fetch All Products for This Vendor ────────────────────────────────────
const fetchAllProducts = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { status, category, search } = req.query;

    const query = { ...vendorProductFilter(vendorId) };
    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: products.map(normalizeVendorProduct),
      count: products.length,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error fetching products", error: e.message });
  }
};

// ── Edit Product ──────────────────────────────────────────────────────────
const editProduct = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { id }   = req.params;
    const { name, description, price, salePrice, stock, category, brand, images, status } = req.body;

    const product = await Product.findOne({ _id: id, ...vendorProductFilter(vendorId) });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (name        !== undefined) product.name        = name;
    if (description !== undefined) product.description = description;
    if (price       !== undefined) product.price       = Number(price);
    if (salePrice   !== undefined) product.salePrice   = Number(salePrice);
    if (stock       !== undefined) product.stock       = Number(stock);
    if (category    !== undefined) product.category    = category;
    if (brand       !== undefined) product.brand       = brand;
    if (images      !== undefined) product.images      = images;
    if (status      !== undefined) product.status      = status;

    // keep legacy fields in sync
    product.title      = product.name;
    product.totalStock = product.stock;
    product.image      = product.images?.[0] || "";

    await product.save();

    res.status(200).json({ success: true, data: product, message: "Product updated" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error updating product", error: e.message });
  }
};

// ── Delete Product ────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { id }   = req.params;

    const product = await Product.findOneAndDelete({ _id: id, ...vendorProductFilter(vendorId) });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error deleting product", error: e.message });
  }
};

// ── Get Single Product ────────────────────────────────────────────────────
const getProductById = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { id }   = req.params;

    const product = await Product.findOne({ _id: id, ...vendorProductFilter(vendorId) });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error fetching product", error: e.message });
  }
};

// ── Bulk Status Update ────────────────────────────────────────────────────
const bulkUpdateStatus = async (req, res) => {
  try {
    const vendorId = getUserId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized vendor" });
    }

    const { productIds, status } = req.body;

    if (!productIds?.length || !status) {
      return res.status(400).json({ success: false, message: "productIds and status required" });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds }, ...vendorProductFilter(vendorId) },
      { status }
    );

    res.status(200).json({ success: true, message: `${result.modifiedCount} products updated` });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Bulk update failed" });
  }
};

module.exports = {
  handleImageUpload, addProduct, fetchAllProducts,
  editProduct, deleteProduct, getProductById, bulkUpdateStatus,
};
