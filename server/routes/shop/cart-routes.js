const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const {
  addToCart,
  fetchCartItems,
  deleteCartItem,
  updateCartItemQty,
} = require("../../controllers/shop/cart-controller");

const router = express.Router();

router.post("/add", apiRateLimiter, addToCart);
router.get("/get/:userId", apiRateLimiter, fetchCartItems);
router.put("/update-cart", apiRateLimiter, updateCartItemQty);
router.delete("/:userId/:productId", apiRateLimiter, deleteCartItem);

module.exports = router;
