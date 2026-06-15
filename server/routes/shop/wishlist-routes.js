const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../../controllers/shop/wishlist-controller");

const router = express.Router();

router.use(authMiddleware);
router.get("/get/:userId", apiRateLimiter, getWishlist);
router.post("/add", apiRateLimiter, addToWishlist);
router.delete("/:userId/:productId", apiRateLimiter, removeFromWishlist);

module.exports = router;
