const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { getProfile, updateProfile, changePassword } = require("../../controllers/vendor/profile-controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/",                 apiRateLimiter, getProfile);
router.put("/",                 apiRateLimiter, updateProfile);
router.put("/change-password",  apiRateLimiter, changePassword);

module.exports = router;
