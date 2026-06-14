const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForVendor,
  updateOrderStatus,
  getOrderStats,
} = require("../../controllers/vendor/order-controller");

const router = express.Router();

// All vendor order routes require authentication
router.use(authMiddleware);

router.get("/get",         getAllOrdersOfAllUsers);
router.get("/stats",       getOrderStats);
router.get("/details/:id", getOrderDetailsForVendor);
router.put("/update/:id",  updateOrderStatus);

module.exports = router;
