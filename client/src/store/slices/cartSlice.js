import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = "http://localhost:5000/api/cart";

// Extract the full cart item list from supported API response formats.
const getCartItems = (data) => {
  if (Array.isArray(data?.cart?.items)) return data.cart.items;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cart)) return data.cart;
  return null;
};

// Add a book to the backend cart.
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ bookId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return rejectWithValue("Please login to add items to cart.");
      }

      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookId, quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(
          data.message || "Failed to add book to cart."
        );
      }

      return {
        items: getCartItems(data),
        message: data.message || "Book added to cart successfully.",
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Unable to connect to the server."
      );
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  successMessage: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    setCart: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.error = null;
    },

    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => {
        const bookId =
          item.book?._id ||
          item.book ||
          item.bookId?._id ||
          item.bookId ||
          item._id;

        return String(bookId) !== String(action.payload);
      });
    },

    clearCart: (state) => {
      state.items = [];
      state.error = null;
      state.successMessage = null;
    },

    clearCartMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })

      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;

        // Replace Redux items only when the API returns the FULL cart.
        // Never replace a multi-book cart with a single returned item.
        if (Array.isArray(action.payload.items)) {
          state.items = action.payload.items;
        }
      })

      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ||
          action.error.message ||
          "Failed to add book to cart.";
      });
  },
});

export const {
  setCart,
  removeFromCart,
  clearCart,
  clearCartMessages,
} = cartSlice.actions;

export default cartSlice.reducer;