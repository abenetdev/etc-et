const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const {
  getAllWithdrawals,
  getWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal,
} = require("../../controllers/admin/withdrawals-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/", apiRateLimiter, getAllWithdrawals);
router.get("/:id", apiRateLimiter, getWithdrawalById);
router.put("/:id/approve", apiRateLimiter, approveWithdrawal);
router.put("/:id/reject", apiRateLimiter, rejectWithdrawal);

module.exports = router;
