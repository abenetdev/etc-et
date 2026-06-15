const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForVendor,
  updateOrderStatus,
  getOrderStats,
} = require("../../controllers/vendor/order-controller");

const router = express.Router();

// All vendor order routes require authentication
router.use(authMiddleware);

router.get("/get",         apiRateLimiter, getAllOrdersOfAllUsers);
router.get("/stats",       apiRateLimiter, getOrderStats);
router.get("/details/:id", apiRateLimiter, getOrderDetailsForVendor);
router.put("/update/:id",  apiRateLimiter, updateOrderStatus);

module.exports = router;
