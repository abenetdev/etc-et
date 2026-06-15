const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { apiRateLimiter } = require("../../middleware/rateLimiter");
const { upload } = require("../../helpers/cloudinary");
const {
  handleImageUpload,
  addProduct,
  editProduct,
  fetchAllProducts,
  deleteProduct,
  getProductById,
  bulkUpdateStatus,
} = require("../../controllers/vendor/products-controller");

const router = express.Router();

// All vendor product routes require authentication
router.use(authMiddleware);

router.post("/upload-image", apiRateLimiter, upload.single("my_file"), handleImageUpload);
router.post("/add",          apiRateLimiter, addProduct);
router.get("/get",           apiRateLimiter, fetchAllProducts);
router.get("/get/:id",       apiRateLimiter, getProductById);
router.put("/edit/:id",      apiRateLimiter, editProduct);
router.delete("/delete/:id", apiRateLimiter, deleteProduct);
router.put("/bulk-status",   apiRateLimiter, bulkUpdateStatus);

module.exports = router;
