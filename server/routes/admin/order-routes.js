const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
  confirmEscrowRelease,
  rejectEscrowRelease,
} = require("../../controllers/admin/order-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/get", apiRateLimiter, getAllOrdersOfAllUsers);
router.get("/details/:id", apiRateLimiter, getOrderDetailsForAdmin);
router.put("/update/:id", apiRateLimiter, updateOrderStatus);
router.post("/release-escrow/:id", apiRateLimiter, confirmEscrowRelease);
router.post("/reject-escrow/:id", apiRateLimiter, rejectEscrowRelease);

module.exports = router;
