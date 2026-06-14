const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
  confirmEscrowRelease,
  rejectEscrowRelease,
} = require("../../controllers/admin/order-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/get", getAllOrdersOfAllUsers);
router.get("/details/:id", getOrderDetailsForAdmin);
router.put("/update/:id", updateOrderStatus);
router.post("/release-escrow/:id", confirmEscrowRelease);
router.post("/reject-escrow/:id", rejectEscrowRelease);

module.exports = router;
