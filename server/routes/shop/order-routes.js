const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { paymentRateLimiter } = require("../../middleware/rateLimiter");
const { validateOrderCreation, validateOrderVerification, validateObjectId } = require("../../middleware/validator");

const {
  createOrder,
  verifyOrder,
  chapaWebhook,
  getAllOrdersByUser,
  getOrderDetails,
  confirmDeliveryByCustomer,
} = require("../../controllers/shop/order-controller");

const router = express.Router();

router.post("/create", paymentRateLimiter, validateOrderCreation, createOrder);
router.post("/verify", paymentRateLimiter, validateOrderVerification, verifyOrder);
router.post("/chapa-webhook", chapaWebhook);
router.get("/list/:userId", validateObjectId("userId"), getAllOrdersByUser);
router.get("/details/:id", validateObjectId("id"), getOrderDetails);
router.post("/confirm-delivery/:id", authMiddleware, validateObjectId("id"), confirmDeliveryByCustomer);

module.exports = router;
