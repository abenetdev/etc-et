const express = require("express");
const { getStoreBySlug, getAllStores, debugStore } = require("../../controllers/shop/store-controller");
const router = express.Router();

router.get("/",           getAllStores);
router.get("/:slug/debug", debugStore);  // temporary debug — remove after confirming
router.get("/:slug",      getStoreBySlug);

module.exports = router;
