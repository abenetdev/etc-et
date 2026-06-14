const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../../controllers/shop/wishlist-controller");

const router = express.Router();

router.use(authMiddleware);
router.get("/get/:userId", getWishlist);
router.post("/add", addToWishlist);
router.delete("/:userId/:productId", removeFromWishlist);

module.exports = router;
