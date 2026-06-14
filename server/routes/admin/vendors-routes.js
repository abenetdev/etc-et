const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getAllVendors,
  getVendorById,
  updateStoreStatus,
} = require("../../controllers/admin/vendors-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/", getAllVendors);
router.get("/:id", getVendorById);
router.put("/:id/store-status", updateStoreStatus);

module.exports = router;
