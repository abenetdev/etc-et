const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const {
  getAllVendors,
  getVendorById,
  updateStoreStatus,
  updateAccountStatus,
  deleteVendor,
  resetVendorPassword,
} = require("../../controllers/admin/vendors-controller");

const router = express.Router();

router.use(adminMiddleware);

router.get("/",                             apiRateLimiter, getAllVendors);
router.get("/:id",                          apiRateLimiter, getVendorById);
router.put("/:id/store-status",             apiRateLimiter, updateStoreStatus);
router.put("/:id/account-status",           apiRateLimiter, updateAccountStatus);
router.delete("/:id",                       apiRateLimiter, deleteVendor);
router.put("/:id/reset-password",           apiRateLimiter, resetVendorPassword);

module.exports = router;
