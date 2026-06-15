const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { upload } = require("../../helpers/cloudinary");
const {
  getStore,
  createStore,
  updateStore,
  uploadStoreImage,
  checkSlug,
} = require("../../controllers/vendor/store-controller");

const router = express.Router();

// Slug check is public (needed before auth for registration flow)
router.get("/check-slug/:slug", apiRateLimiter, checkSlug);

// All other store routes require authentication
router.use(authMiddleware);

router.get("/", apiRateLimiter, getStore);
router.post("/", apiRateLimiter, createStore);
router.put("/", apiRateLimiter, updateStore);
router.post("/upload-image", apiRateLimiter, upload.single("my_file"), uploadStoreImage);

module.exports = router;
