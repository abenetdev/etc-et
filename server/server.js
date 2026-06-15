const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// ── Load environment variables FIRST, before any other imports ────────────
require("dotenv").config();

const authRouter = require("./routes/auth/auth-routes");
const adminProductsRouter = require("./routes/admin/products-routes");
const adminOrderRouter = require("./routes/admin/order-routes");
const adminDashboardRouter = require("./routes/admin/dashboard-routes");
const adminVendorsRouter = require("./routes/admin/vendors-routes");
const adminWithdrawalsRouter = require("./routes/admin/withdrawals-routes");

// Vendor routes
const vendorProductsRouter = require("./routes/vendor/products-routes");
const vendorOrderRouter = require("./routes/vendor/order-routes");
const vendorStoreRouter = require("./routes/vendor/store-routes");
const vendorWalletRouter = require("./routes/vendor/wallet-routes");
const vendorDashboardRouter = require("./routes/vendor/dashboard-routes");

const shopProductsRouter = require("./routes/shop/products-routes");
const shopCartRouter = require("./routes/shop/cart-routes");
const shopAddressRouter = require("./routes/shop/address-routes");
const shopOrderRouter = require("./routes/shop/order-routes");
const shopSearchRouter = require("./routes/shop/search-routes");
const shopReviewRouter = require("./routes/shop/review-routes");

const commonFeatureRouter = require("./routes/common/feature-routes");
const { connectDB } = require("./config/db");

//create a database connection -> u can also
//create a separate file for this and then import/use that file here


const app = express();
const PORT = process.env.PORT || 5000;

connectDB()

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);

// Admin routes
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/admin/vendors", adminVendorsRouter);
app.use("/api/admin/withdrawals", adminWithdrawalsRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/orders", adminOrderRouter);

// Vendor routes (new multi-vendor system)
app.use("/api/vendor/products",  vendorProductsRouter);
app.use("/api/vendor/orders",    vendorOrderRouter);
app.use("/api/vendor/store",     vendorStoreRouter);
app.use("/api/vendor/wallet",    vendorWalletRouter);
app.use("/api/vendor/dashboard", vendorDashboardRouter);
app.use("/api/vendor/profile",   require("./routes/vendor/profile-routes"));

app.use("/api/shop/products", shopProductsRouter);
app.use("/api/shop/cart", shopCartRouter);
app.use("/api/shop/address", shopAddressRouter);
app.use("/api/shop/order", shopOrderRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/shop/review", shopReviewRouter);
app.use("/api/shop/wishlist", require("./routes/shop/wishlist-routes"));
app.use("/api/shop/home", require("./routes/shop/home-routes"));
app.use("/api/shop/store", require("./routes/shop/store-routes"));
app.use("/api/shop/seller", require("./routes/shop/seller-routes"));

app.use("/api/admin/seller-applications", require("./routes/admin/seller-application-routes"));

app.use("/api/common/feature", commonFeatureRouter);

app.listen(PORT, () => console.log(`Server is now running on port ${PORT}`));
