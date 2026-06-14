const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
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
router.get("/check-slug/:slug", checkSlug);

// All other store routes require authentication
router.use(authMiddleware);

router.get("/", getStore);
router.post("/", createStore);
router.put("/", updateStore);
router.post("/upload-image", upload.single("my_file"), uploadStoreImage);

module.exports = router;
