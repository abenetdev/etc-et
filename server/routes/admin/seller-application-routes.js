const express = require("express");
const { adminMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getAllApplications,
  approveApplication,
  rejectApplication,
} = require("../../controllers/shop/seller-controller");

const router = express.Router();

router.use(adminMiddleware);

router.get("/",              getAllApplications);
router.put("/:id/approve",   approveApplication);
router.put("/:id/reject",    rejectApplication);

module.exports = router;
