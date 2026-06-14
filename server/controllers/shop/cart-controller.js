const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

// ── Helper: resolve correct image and title from a product doc ─────────────
function resolveProductFields(product) {
  const title = product.name || product.title || "Unknown Product";
  const image =
    (product.images && product.images.length > 0)
      ? product.images[0]
      : (product.image || "");
  const stock =
    product.stock !== undefined ? product.stock : (product.totalStock || 0);
  return { title, image, stock };
}

const addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Stock check
    const { stock } = resolveProductFields(product);
    if (quantity > stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${stock} items available in stock`,
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const findCurrentProductIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (findCurrentProductIndex === -1) {
      cart.items.push({ productId, quantity });
    } else {
      const newQty = cart.items[findCurrentProductIndex].quantity + quantity;
      if (newQty > stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${stock} items available in stock`,
        });
      }
      cart.items[findCurrentProductIndex].quantity = newQty;
    }

    await cart.save();
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

const fetchCartItems = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User id is mandatory!" });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "name title image images price salePrice stock totalStock",
    });

    if (!cart) {
      // Return empty cart instead of 404 — avoids client errors on first load
      return res.status(200).json({
        success: true,
        data: { _id: null, userId, items: [] },
      });
    }

    const validItems = cart.items.filter((item) => item.productId);
    if (validItems.length < cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    const populateCartItems = validItems.map((item) => {
      const { title, image, stock } = resolveProductFields(item.productId);
      return {
        productId:  item.productId._id,
        image,
        title,
        price:      item.productId.price,
        salePrice:  item.productId.salePrice,
        totalStock: stock,
        quantity:   item.quantity,
      };
    });

    res.status(200).json({
      success: true,
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

const updateCartItemQty = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    const findCurrentProductIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (findCurrentProductIndex === -1) {
      return res.status(404).json({ success: false, message: "Cart item not present!" });
    }

    cart.items[findCurrentProductIndex].quantity = quantity;
    await cart.save();

    await cart.populate({
      path: "items.productId",
      select: "name title image images price salePrice stock totalStock",
    });

    const populateCartItems = cart.items.map((item) => {
      const { title, image, stock } = resolveProductFields(item.productId);
      return {
        productId:  item.productId ? item.productId._id : null,
        image,
        title,
        price:      item.productId ? item.productId.price : null,
        salePrice:  item.productId ? item.productId.salePrice : null,
        totalStock: stock,
        quantity:   item.quantity,
      };
    });

    res.status(200).json({
      success: true,
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "name title image images price salePrice stock totalStock",
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId._id.toString() !== productId
    );
    await cart.save();

    await cart.populate({
      path: "items.productId",
      select: "name title image images price salePrice stock totalStock",
    });

    const populateCartItems = cart.items.map((item) => {
      const { title, image, stock } = resolveProductFields(item.productId);
      return {
        productId:  item.productId ? item.productId._id : null,
        image,
        title,
        price:      item.productId ? item.productId.price : null,
        salePrice:  item.productId ? item.productId.salePrice : null,
        totalStock: stock,
        quantity:   item.quantity,
      };
    });

    res.status(200).json({
      success: true,
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

module.exports = { addToCart, updateCartItemQty, deleteCartItem, fetchCartItems };
