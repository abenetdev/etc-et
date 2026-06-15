const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const { searchProducts } = require("../../controllers/shop/search-controller");

const router = express.Router();

router.get("/:keyword", apiRateLimiter, searchProducts);

module.exports = router;
