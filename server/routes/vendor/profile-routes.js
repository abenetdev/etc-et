const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { getProfile, updateProfile, changePassword } = require("../../controllers/vendor/profile-controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/",                 getProfile);
router.put("/",                 updateProfile);
router.put("/change-password",  changePassword);

module.exports = router;
