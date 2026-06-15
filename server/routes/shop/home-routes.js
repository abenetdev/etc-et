const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { getHomeData } = require("../../controllers/shop/home-controller");
const router = express.Router();

router.get("/", apiRateLimiter, getHomeData);

module.exports = router;
