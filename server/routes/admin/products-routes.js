const express = require("express");
const { apiRateLimiter } = require("../../middleware/rateLimiter");

const {
  handleImageUpload,
  addProduct,
  editProduct,
  fetchAllProducts,
  deleteProduct,
} = require("../../controllers/admin/products-controller");

const { upload } = require("../../helpers/cloudinary");

const router = express.Router();

router.post("/upload-image", apiRateLimiter, upload.single("my_file"), handleImageUpload);
router.post("/add", apiRateLimiter, addProduct);
router.put("/edit/:id", apiRateLimiter, editProduct);
router.delete("/delete/:id", apiRateLimiter, deleteProduct);
router.get("/get", apiRateLimiter, fetchAllProducts);

module.exports = router;
