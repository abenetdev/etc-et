const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getWallet, getTransactions, getWithdrawals,
  requestWithdrawal, getEarningsBreakdown,
  getPayoutSettings, updatePayoutSettings,
} = require("../../controllers/vendor/wallet-controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/",                  getWallet);
router.get("/transactions",      getTransactions);
router.get("/withdrawals",       getWithdrawals);
router.post("/withdraw",         requestWithdrawal);
router.get("/earnings-breakdown", getEarningsBreakdown);
router.get("/payout-settings",   getPayoutSettings);
router.put("/payout-settings",   updatePayoutSettings);

module.exports = router;
