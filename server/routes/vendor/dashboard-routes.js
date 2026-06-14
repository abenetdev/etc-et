const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { getDashboard } = require("../../controllers/vendor/dashboard-controller");
const router = express.Router();

router.use(authMiddleware);
router.get("/", getDashboard);

module.exports = router;
