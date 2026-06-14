import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  isListLoading: false,
  isSubmitting: false,
  orderList: [],
  orderDetails: null,
  orderStats: null,
  error: null,
};

export const getAllOrdersForVendor = createAsyncThunk(
  "/vendor/order/getAllOrdersForVendor",
  async (params = {}) => {
    const { status, search, startDate, endDate } = params;
    
    let url = `http://localhost:5000/api/vendor/orders/get?`;
    const queryParams = [];
    
    if (status && status !== "all") queryParams.push(`status=${status}`);
    if (search)     queryParams.push(`search=${search}`);
    if (startDate)  queryParams.push(`startDate=${startDate}`);
    if (endDate)    queryParams.push(`endDate=${endDate}`);
    
    url += queryParams.join('&');

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  }
);

export const getOrderDetailsForVendor = createAsyncThunk(
  "/vendor/order/getOrderDetailsForVendor",
  async (id) => {
    const response = await axios.get(
      `http://localhost:5000/api/vendor/orders/details/${id}`,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const updateOrderStatus = createAsyncThunk(
  "/vendor/order/updateOrderStatus",
  async ({ id, orderStatus }) => {
    const response = await axios.put(
      `http://localhost:5000/api/vendor/orders/update/${id}`,
      { orderStatus },
      { withCredentials: true }
    );
    return response.data;
  }
);

export const getOrderStats = createAsyncThunk(
  "/vendor/order/getOrderStats",
  async () => {
    const response = await axios.get(
      "http://localhost:5000/api/vendor/orders/stats",
      { withCredentials: true }
    );
    return response.data;
  }
);

const vendorOrderSlice = createSlice({
  name: "vendorOrder",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      console.log("resetOrderDetails");
      state.orderDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all orders
      .addCase(getAllOrdersForVendor.pending, (state) => {
        state.isListLoading = true;
        state.error = null;
      })
      .addCase(getAllOrdersForVendor.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.orderList = action.payload?.data || [];
      })
      .addCase(getAllOrdersForVendor.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error?.message || "Failed to load orders";
      })
      // Get order details
      .addCase(getOrderDetailsForVendor.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(getOrderDetailsForVendor.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.orderDetails = action.payload.data;
      })
      .addCase(getOrderDetailsForVendor.rejected, (state) => {
        state.isSubmitting = false;
        state.orderDetails = null;
      })
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(updateOrderStatus.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(updateOrderStatus.rejected, (state) => {
        state.isSubmitting = false;
      })
      // Get order stats
      .addCase(getOrderStats.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(getOrderStats.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.orderStats = action.payload.data;
      })
      .addCase(getOrderStats.rejected, (state) => {
        state.isSubmitting = false;
        state.orderStats = null;
      });
  },
});

export const { resetOrderDetails } = vendorOrderSlice.actions;

export default vendorOrderSlice.reducer;
