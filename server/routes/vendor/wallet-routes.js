const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const {
  getWallet, getTransactions, getWithdrawals,
  requestWithdrawal, getEarningsBreakdown,
  getPayoutSettings, updatePayoutSettings,
} = require("../../controllers/vendor/wallet-controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/",                  apiRateLimiter, getWallet);
router.get("/transactions",      apiRateLimiter, getTransactions);
router.get("/withdrawals",       apiRateLimiter, getWithdrawals);
router.post("/withdraw",         apiRateLimiter, requestWithdrawal);
router.get("/earnings-breakdown", apiRateLimiter, getEarningsBreakdown);
router.get("/payout-settings",   apiRateLimiter, getPayoutSettings);
router.put("/payout-settings",   apiRateLimiter, updatePayoutSettings);

module.exports = router;
