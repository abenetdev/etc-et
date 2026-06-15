const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const {
  getFilteredProducts,
  getProductDetails,
} = require("../../controllers/shop/products-controller");

const router = express.Router();

router.get("/get", apiRateLimiter, getFilteredProducts);
router.get("/get/:id", apiRateLimiter, getProductDetails);

module.exports = router;
