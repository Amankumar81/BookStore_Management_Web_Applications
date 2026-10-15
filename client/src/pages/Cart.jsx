import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";


import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { setCart } from "../store/slices/cartSlice";
import usePageTitle from "../hooks/usePageTitle";

const API_BASE_URL = "https://bookstore-management-web-applications.onrender.com";

// Column layout shared by the list header and every row (desktop)
const DESKTOP_COLUMNS = "64px minmax(0,1fr) 90px 116px 96px 40px";

// Works with full URLs, data URLs and backend-relative paths like "/uploads/x.jpg"
const getImageUrl = (image) => {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${API_BASE_URL}/${image.replace(/^\/+/, "")}`;
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// ============================================================
// Normalize cart items.
// Rows of the same book are merged into ONE row with the
// quantities added together.
// ============================================================
const normalizeItems = (items = []) => {
  const merged = new Map();

  items.forEach((item) => {
    const book = item.book || item;
    const id = String(typeof book === "object" ? book._id : book);
    const quantity = Number(item.quantity || 1);

    if (merged.has(id)) {
      merged.get(id).quantity += quantity;
    } else {
      merged.set(id, {
        ...item,
        book,
        quantity,
        price: Number(item.price ?? book?.discountPrice ?? book?.price ?? 0),
      });
    }
  });

  return Array.from(merged.values());
};

// ============================================================
// Book thumbnail with graceful fallback
// ============================================================
const Thumb = ({ book }) => {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(book.image);

  return (
    <Box
      sx={{
        width: 64,
        height: 88,
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "#f1f5f9",
        border: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={book.title || "Book"}
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <MenuBookOutlinedIcon />
      )}
    </Box>
  );
};

// ============================================================
// Quantity stepper
// ============================================================
const Stepper = ({ quantity, disabled, canIncrease, onChange }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid #cbd5e1",
      borderRadius: 999,
      bgcolor: "#fff",
    }}
  >
    <IconButton
      size="small"
      aria-label="Decrease quantity"
      disabled={disabled || quantity <= 1}
      onClick={() => onChange(quantity - 1)}
    >
      <RemoveIcon sx={{ fontSize: 16 }} />
    </IconButton>

    <Typography
      sx={{ minWidth: 28, textAlign: "center", fontWeight: 700, fontSize: 14 }}
    >
      {quantity}
    </Typography>

    <IconButton
      size="small"
      aria-label="Increase quantity"
      disabled={disabled || !canIncrease}
      onClick={() => onChange(quantity + 1)}
    >
      <AddIcon sx={{ fontSize: 16 }} />
    </IconButton>
  </Box>
);

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const reduxCartItems = useSelector((state) => state.cart?.items || []);

  const token = localStorage.getItem("token");

  const [cartItems, setCartItems] = useState(() =>
    normalizeItems(reduxCartItems)
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // Load / Reload Cart
  // ============================================================
  const reloadCart = async () => {
    if (!token) {
      setCartItems([]);
      dispatch(setCart([]));
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load cart");
      }

      const backendItems = normalizeItems(data.cart?.items || data.items || []);

      setCartItems(backendItems);
      dispatch(setCart(backendItems));
    } catch (err) {
      console.error("Cart loading error:", err);
      setError(err.message || "Failed to load your cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadCart();
  }, []);

  useEffect(() => {
    if (reduxCartItems.length > 0) {
      setCartItems(normalizeItems(reduxCartItems));
    }
  }, [reduxCartItems]);

  // ============================================================
  // Actions
  // ============================================================
  const handleRemove = async (bookId) => {
    if (!token) return navigate("/login");

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/cart/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove item");
      }

      await reloadCart();
    } catch (err) {
      console.error("Remove cart item error:", err);
      setError(err.message || "Failed to remove item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuantityChange = async (bookId, newQuantity, stock) => {
    if (!token) return navigate("/login");

    const quantity = Number(newQuantity);

    if (quantity < 1) return;

    if (stock !== undefined && quantity > Number(stock)) {
      setError(
        `Only ${stock} item${Number(stock) === 1 ? "" : "s"} available in stock.`
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/cart/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update quantity");
      }

      await reloadCart();
    } catch (err) {
      console.error("Quantity update error:", err);
      setError(err.message || "Failed to update quantity");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearCart = async () => {
    if (!token) return navigate("/login");

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to clear cart");
      }

      setCartItems([]);
      dispatch(setCart([]));
    } catch (err) {
      console.error("Clear cart error:", err);
      setError(err.message || "Failed to clear cart");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // Calculations
  // ============================================================
  const subtotal = cartItems.reduce((sum, item) => {
    const book = item.book || {};
    const price = Number(item.price ?? book.discountPrice ?? book.price ?? 0);
    return sum + price * Number(item.quantity || 0);
  }, 0);

  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 49;
  const total = subtotal + shipping;
  const totalItems = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">Loading your cart...</Typography>
        </Stack>
      </Box>
    );
  }

  // ============================================================
  // Empty Cart
  // ============================================================
  if (cartItems.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Paper
          elevation={0}
          sx={{
            minHeight: 420,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            p: 4,
          }}
        >
          <Stack alignItems="center" spacing={2} maxWidth={440}>
            <ShoppingCartOutlinedIcon sx={{ fontSize: 48, color: "#4f46e5" }} />

            <Typography variant="h4" fontWeight={800} color="#0f172a">
              Your cart is empty
            </Typography>

            <Typography color="text.secondary">
              Books you add will show up here. Browse the catalogue to find
              your next read.
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/books")}
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Browse books
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // ============================================================
  // Cart UI
  // ============================================================
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ color: "#0f172a", fontSize: { xs: "1.7rem", md: "2.1rem" } }}
            >
              Shopping cart
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
            </Typography>
          </Box>

          <Button
            variant="text"
            color="error"
            startIcon={<DeleteSweepOutlinedIcon />}
            onClick={handleClearCart}
            disabled={actionLoading}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Clear cart
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              border: "1px solid #fecaca",
              bgcolor: "#fef2f2",
            }}
          >
            <Typography color="error" fontWeight={600}>
              {error}
            </Typography>
          </Paper>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 380px" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* ==================================================
              LEFT - CART LIST (single container, compact rows)
          ================================================== */}
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e2e8f0",
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "#fff",
            }}
          >
            {/* Column header (desktop only) */}
            <Box
              sx={{
                display: { xs: "none", md: "grid" },
                gridTemplateColumns: DESKTOP_COLUMNS,
                columnGap: 2,
                px: 2.5,
                py: 1.25,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Box sx={{ gridColumn: "1 / 3" }}>Book</Box>
              <Box>Price</Box>
              <Box>Quantity</Box>
              <Box sx={{ textAlign: "right" }}>Total</Box>
              <Box />
            </Box>

            {cartItems.map((item, index) => {
              const book = item.book || {};
              const bookId = book._id || item.book;
              const quantity = Number(item.quantity || 1);
              const stock =
                book.stock !== undefined ? Number(book.stock) : undefined;

              const itemPrice = Number(
                item.price ?? book.discountPrice ?? book.price ?? 0
              );
              const originalPrice = Number(book.price || 0);
              const hasDiscount = originalPrice > itemPrice && itemPrice > 0;
              const itemTotal = itemPrice * quantity;

              const lowStock = stock !== undefined && stock > 0 && stock <= 5;
              const outOfStock = stock !== undefined && stock <= 0;

              return (
                <Box
                  key={`${bookId}-${index}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "64px minmax(0,1fr) auto",
                      md: DESKTOP_COLUMNS,
                    },
                    gridTemplateAreas: {
                      xs: `"img info remove" "img qty total"`,
                      md: `"img info price qty total remove"`,
                    },
                    columnGap: 2,
                    rowGap: 1,
                    alignItems: "center",
                    px: { xs: 2, md: 2.5 },
                    py: 2,
                    borderTop: index === 0 ? "none" : "1px solid #eef2f6",
                    transition: "background-color .15s",
                    "&:hover": { bgcolor: "#fafbfd" },
                  }}
                >
                  <Box sx={{ gridArea: "img" }}>
                    <Thumb book={book} />
                  </Box>

                  {/* Info */}
                  <Box sx={{ gridArea: "info", minWidth: 0 }}>
                    <Typography
                      fontWeight={700}
                      onClick={() => bookId && navigate(`/books/${bookId}`)}
                      sx={{
                        color: "#0f172a",
                        cursor: "pointer",
                        fontSize: 15,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        "&:hover": { color: "#4f46e5" },
                      }}
                    >
                      {book.title || "Untitled book"}
                    </Typography>

                    <Typography
                      noWrap
                      sx={{ color: "#64748b", fontSize: 13, mt: 0.25 }}
                    >
                      {[book.author && `by ${book.author}`, book.category]
                        .filter(Boolean)
                        .join(" • ")}
                    </Typography>

                    {stock !== undefined && (
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 12,
                          fontWeight: 600,
                          color: outOfStock
                            ? "#dc2626"
                            : lowStock
                            ? "#d97706"
                            : "#16a34a",
                        }}
                      >
                        {outOfStock
                          ? "Out of stock"
                          : lowStock
                          ? `Only ${stock} left`
                          : "In stock"}
                      </Typography>
                    )}
                  </Box>

                  {/* Price (desktop) */}
                  <Box sx={{ gridArea: "price", display: { xs: "none", md: "block" } }}>
                    <Typography fontWeight={700} fontSize={14}>
                      {money(itemPrice)}
                    </Typography>
                    {hasDiscount && (
                      <Typography
                        sx={{
                          color: "#94a3b8",
                          textDecoration: "line-through",
                          fontSize: 12,
                        }}
                      >
                        {money(originalPrice)}
                      </Typography>
                    )}
                  </Box>

                  {/* Quantity */}
                  <Box sx={{ gridArea: "qty" }}>
                    <Stepper
                      quantity={quantity}
                      disabled={actionLoading}
                      canIncrease={stock === undefined || quantity < stock}
                      onChange={(q) => handleQuantityChange(bookId, q, stock)}
                    />
                  </Box>

                  {/* Line total */}
                  <Box sx={{ gridArea: "total", textAlign: "right" }}>
                    <Typography fontWeight={800} fontSize={15} color="#0f172a">
                      {money(itemTotal)}
                    </Typography>
                    {quantity > 1 && (
                      <Typography
                        sx={{
                          display: { xs: "none", md: "block" },
                          color: "#94a3b8",
                          fontSize: 12,
                        }}
                      >
                        {quantity} × {money(itemPrice)}
                      </Typography>
                    )}
                  </Box>

                  {/* Remove */}
                  <Box sx={{ gridArea: "remove", justifySelf: "end" }}>
                    <IconButton
                      size="small"
                      aria-label="Remove from cart"
                      disabled={actionLoading}
                      onClick={() => handleRemove(bookId)}
                      sx={{
                        color: "#94a3b8",
                        "&:hover": { color: "#dc2626", bgcolor: "#fef2f2" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Paper>

          {/* ==================================================
              RIGHT - ORDER SUMMARY (unchanged)
          ================================================== */}
          <Paper
            elevation={0}
            sx={{
              position: { xs: "static", lg: "sticky" },
              top: { lg: 20 },
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 3,
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                color: "white",
              }}
            >
              <Typography variant="h5" fontWeight={900}>
                Order Summary
              </Typography>

              <Typography
                sx={{ mt: 0.5, color: "rgba(255,255,255,0.7)", fontSize: 14 }}
              >
                Review your cart before checkout
              </Typography>
            </Box>

            <Box sx={{ p: 3, bgcolor: "#fff" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Items</Typography>
                <Typography fontWeight={700}>{totalItems}</Typography>
              </Box>

              <Box
                sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}
              >
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography fontWeight={800}>{money(subtotal)}</Typography>
              </Box>

              <Box
                sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}
              >
                <Typography color="text.secondary">Shipping</Typography>
                <Typography
                  fontWeight={800}
                  sx={{ color: shipping === 0 ? "#16a34a" : "#0f172a" }}
                >
                  {shipping === 0 ? "FREE" : `₹${shipping}`}
                </Typography>
              </Box>

              {subtotal > 0 && subtotal < 999 && (
                <Typography sx={{ mt: 1.5, fontSize: 12, color: "#64748b" }}>
                  Add {money(999 - subtotal)} more to get free shipping.
                </Typography>
              )}

              <Box
                sx={{
                  borderTop: "1px solid #e2e8f0",
                  mt: 2,
                  pt: 2,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography fontWeight={900} fontSize={18}>
                  Total
                </Typography>
                <Typography fontWeight={900} fontSize={18}>
                  {money(total)}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={actionLoading || cartItems.length === 0}
                onClick={() => navigate("/checkout")}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Proceed to Checkout
              </Button>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/books")}
                sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
              >
                Continue Shopping
              </Button>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={2}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <LocalShippingOutlinedIcon sx={{ color: "#4f46e5" }} />
                  <Box>
                    <Typography fontWeight={800} fontSize={14}>
                      Free Shipping
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      On orders above ₹999
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <SecurityOutlinedIcon sx={{ color: "#16a34a" }} />
                  <Box>
                    <Typography fontWeight={800} fontSize={14}>
                      Secure Checkout
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      Your information is protected
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Cart;