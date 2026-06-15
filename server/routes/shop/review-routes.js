const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const {
  addProductReview,
  getProductReviews,
} = require("../../controllers/shop/product-review-controller");

const router = express.Router();

router.post("/add", apiRateLimiter, addProductReview);
router.get("/:productId", apiRateLimiter, getProductReviews);

module.exports = router;
