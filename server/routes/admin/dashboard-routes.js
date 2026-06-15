const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { getDashboard } = require("../../controllers/admin/dashboard-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/", apiRateLimiter, getDashboard);

module.exports = router;
