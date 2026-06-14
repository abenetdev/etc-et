const express = require("express");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
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

router.post("/upload-image", upload.single("my_file"), handleImageUpload);
router.post("/add",          addProduct);
router.get("/get",           fetchAllProducts);
router.get("/get/:id",       getProductById);
router.put("/edit/:id",      editProduct);
router.delete("/delete/:id", deleteProduct);
router.put("/bulk-status",   bulkUpdateStatus);

module.exports = router;
