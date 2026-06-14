const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getAllWithdrawals,
  getWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal,
} = require("../../controllers/admin/withdrawals-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/", getAllWithdrawals);
router.get("/:id", getWithdrawalById);
router.put("/:id/approve", approveWithdrawal);
router.put("/:id/reject", rejectWithdrawal);

module.exports = router;
