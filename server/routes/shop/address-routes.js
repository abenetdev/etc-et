const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const {
  addAddress,
  fetchAllAddress,
  editAddress,
  deleteAddress,
} = require("../../controllers/shop/address-controller");

const router = express.Router();

router.post("/add", apiRateLimiter, addAddress);
router.get("/get/:userId", apiRateLimiter, fetchAllAddress);
router.delete("/delete/:userId/:addressId", apiRateLimiter, deleteAddress);
router.put("/update/:userId/:addressId", apiRateLimiter, editAddress);

module.exports = router;
