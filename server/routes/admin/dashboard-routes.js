const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const { getDashboard } = require("../../controllers/admin/dashboard-controller");

const router = express.Router();

router.use(adminMiddleware);
router.get("/", getDashboard);

module.exports = router;
