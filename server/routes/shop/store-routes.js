const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { getStoreBySlug, getAllStores, debugStore } = require("../../controllers/shop/store-controller");
const router = express.Router();

router.get("/",           apiRateLimiter, getAllStores);
router.get("/:slug/debug", apiRateLimiter, debugStore);  // temporary debug — remove after confirming
router.get("/:slug",      apiRateLimiter, getStoreBySlug);

module.exports = router;
