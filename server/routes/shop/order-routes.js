const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");

const {
  createOrder,
  verifyOrder,
  chapaWebhook,
  getAllOrdersByUser,
  getOrderDetails,
  confirmDeliveryByCustomer,
} = require("../../controllers/shop/order-controller");

const router = express.Router();

router.post("/create", createOrder);
router.post("/verify", verifyOrder);
router.post("/chapa-webhook", chapaWebhook);
router.get("/list/:userId", getAllOrdersByUser);
router.get("/details/:id", getOrderDetails);
router.post("/confirm-delivery/:id", authMiddleware, confirmDeliveryByCustomer);

module.exports = router;
