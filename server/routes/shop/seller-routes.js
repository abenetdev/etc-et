const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  applyToBecomeSeller,
  getSellerStatus,
} = require("../../controllers/shop/seller-controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/apply",  applyToBecomeSeller);
router.get("/status",  getSellerStatus);

module.exports = router;
