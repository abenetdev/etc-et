import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth-slice";
import adminProductsSlice from "./admin/products-slice";
import adminOrderSlice from "./admin/order-slice";
import adminDashboardSlice from "./admin/dashboard-slice";
import adminVendorsSlice from "./admin/vendors-slice";
import adminWithdrawalsSlice from "./admin/withdrawals-slice";

import vendorProductsSlice from "./vendor/products-slice";
import vendorOrderSlice from "./vendor/order-slice";
import vendorStoreSlice from "./vendor/store-slice";
import vendorWalletSlice from "./vendor/wallet-slice";
import vendorDashboardSlice from "./vendor/dashboard-slice";
import vendorProfileSlice from "./vendor/profile-slice";

import shopProductsSlice from "./shop/products-slice";
import shopCartSlice from "./shop/cart-slice";
import shopAddressSlice from "./shop/address-slice";
import shopOrderSlice from "./shop/order-slice";
import shopSearchSlice from "./shop/search-slice";
import shopReviewSlice from "./shop/review-slice";
import shopHomeSlice from "./shop/home-slice";
import shopStoreSlice from "./shop/store-slice";
import shopWishlistSlice from "./shop/wishlist-slice";
import shopSellerSlice from "./shop/seller-slice";
import commonFeatureSlice from "./common-slice";
import adminSellerApplicationsSlice from "./admin/seller-applications-slice";

const store = configureStore({
  reducer: {
    auth: authReducer,

    adminDashboard: adminDashboardSlice,
    adminVendors: adminVendorsSlice,
    adminWithdrawals: adminWithdrawalsSlice,
    adminProducts: adminProductsSlice,
    adminOrder: adminOrderSlice,

    // Vendor slices
    vendorProducts: vendorProductsSlice,
    vendorOrder: vendorOrderSlice,
    vendorStore: vendorStoreSlice,
    vendorWallet: vendorWalletSlice,
    vendorDashboard: vendorDashboardSlice,
    vendorProfile: vendorProfileSlice,

    shopProducts: shopProductsSlice,
    shopCart: shopCartSlice,
    shopAddress: shopAddressSlice,
    shopOrder: shopOrderSlice,
    shopSearch: shopSearchSlice,
    shopReview: shopReviewSlice,
    shopHome: shopHomeSlice,
    shopStore: shopStoreSlice,
    shopWishlist: shopWishlistSlice,
    shopSeller: shopSellerSlice,

    adminSellerApplications: adminSellerApplicationsSlice,

    commonFeature: commonFeatureSlice,
  },
});

export default store;
