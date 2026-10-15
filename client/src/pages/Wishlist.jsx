import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
} from "@mui/material";

import {
  Favorite,
  ShoppingCartOutlined,
  ArrowBack,
  Refresh,
  MenuBook,
} from "@mui/icons-material";

const API_BASE_URL = "http://localhost:5000";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// Supports image as string, { url }, or images[0]
const getImageUrl = (book) => {
  const raw =
    (typeof book?.image === "string" ? book.image : book?.image?.url) ||
    (typeof book?.images?.[0] === "string"
      ? book.images[0]
      : book?.images?.[0]?.url) ||
    "";

  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return `${API_BASE_URL}/${raw.replace(/^\/+/, "")}`;
};

// Works with different backend response shapes
const getBook = (item) => {
  if (!item) return null;
  if (item.book && typeof item.book === "object") return item.book;
  if (item.bookId && typeof item.bookId === "object") return item.bookId;
  return item;
};

// ============================================================
// Book thumbnail with fallback
// ============================================================
const Thumb = ({ book }) => {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(book);

  return (
    <Box
      sx={{
        height: 220,
        width: "100%",
        bgcolor: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={book.title || "Book"}
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", "&:hover": { transform: "scale(1.05)" } }}
        />
      ) : (
        <MenuBook sx={{ fontSize: 48 }} />
      )}
    </Box>
  );
};

function Wishlist() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [cartLoadingId, setCartLoadingId] = useState(null);
  const [addingAll, setAddingAll] = useState(false);

  // ==========================================
  // Load Wishlist
  // ==========================================
  const fetchWishlist = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        console.error("WISHLIST JSON ERROR:", error);
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to load wishlist");
      }

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.wishlist)
        ? data.wishlist
        : Array.isArray(data.wishlist?.items)
        ? data.wishlist.items
        : Array.isArray(data.wishlist?.books)
        ? data.wishlist.books
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.books)
        ? data.books
        : [];

      setWishlistItems(items);
    } catch (error) {
      console.error("FETCH WISHLIST ERROR:", error);
      toast.error(error.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  // ==========================================
  // Remove from wishlist
  // ==========================================
  const handleRemove = async (bookId) => {
    if (!token) return navigate("/login");

    try {
      setRemovingId(bookId);

      const response = await fetch(`${API_BASE_URL}/api/wishlist/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        console.error("REMOVE WISHLIST JSON ERROR:", error);
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove from wishlist");
      }

      setWishlistItems((prev) =>
        prev.filter((item) => String(getBook(item)?._id) !== String(bookId))
      );

      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("REMOVE WISHLIST ERROR:", error);
      toast.error(error.message || "Failed to remove from wishlist");
    } finally {
      setRemovingId(null);
    }
  };

  // ==========================================
  // Add to cart
  // ==========================================
  const addBookToCart = async (book) => {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookId: book._id, quantity: 1 }),
    });

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error("ADD CART JSON ERROR:", error);
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to add book to cart");
    }
  };

  const handleAddToCart = async (book) => {
    if (!token) {
      toast.error("Please login to add items to cart");
      return navigate("/login");
    }

    if (!book?._id) return toast.error("Book information unavailable");
    if (!book.stock || book.stock <= 0) {
      return toast.error("This book is out of stock");
    }

    try {
      setCartLoadingId(book._id);
      await addBookToCart(book);
      toast.success("Book added to cart");
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      toast.error(error.message || "Failed to add book to cart");
    } finally {
      setCartLoadingId(null);
    }
  };

  // ==========================================
  // Derived data
  // ==========================================
  const books = useMemo(
    () => wishlistItems.map(getBook).filter(Boolean),
    [wishlistItems]
  );

  const priceOf = (b) => Number(b.discountPrice || b.price || 0);

  const inStockBooks = books.filter((b) => Number(b.stock) > 0);
  const totalValue = books.reduce((sum, b) => sum + priceOf(b), 0);

  const handleAddAll = async () => {
    if (inStockBooks.length === 0) return;

    try {
      setAddingAll(true);

      for (const book of inStockBooks) {
        await addBookToCart(book);
      }

      toast.success(
        `${inStockBooks.length} book${inStockBooks.length > 1 ? "s" : ""} added to cart`
      );
    } catch (error) {
      console.error("ADD ALL ERROR:", error);
      toast.error(error.message || "Failed to add books to cart");
    } finally {
      setAddingAll(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Favorite sx={{ fontSize: 64, color: "#e11d48", mb: 2 }} />
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Log in to see your wishlist
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Save books you like and find them here on any device.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{ textTransform: "none", fontWeight: 700, px: 4, py: 1.3, borderRadius: 2 }}
        >
          Log in
        </Button>
      </Container>
    );
  }

  if (books.length === 0) {
    return (
      <Box sx={{ minHeight: "80vh", bgcolor: "#f8fafc", py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", p: { xs: 4, md: 7 } }}>
            <Favorite sx={{ fontSize: 72, color: "#fecdd3", mb: 2 }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Your wishlist is empty
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Tap the heart on any book to save it here.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => navigate("/books")}
              sx={{ textTransform: "none", fontWeight: 700, px: 4, py: 1.3, borderRadius: 2 }}
            >
              Browse books
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", py: { xs: 2, md: 4 } }}>
      <Container maxWidth={false} sx={{ maxWidth: 1400, px: { xs: 2, md: 3 } }}>
        
        {/* ================= HEADER SECTION (Larger & Prominent) ================= */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h3" fontWeight={800} color="#0f172a" sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, display: "flex", alignItems: "center", gap: 1.5 }}>
              My Wishlist <Box component="span" sx={{ fontSize: "2rem" }}>❤️</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
              {books.length} item{books.length > 1 ? "s" : ""} saved • Total value: <Box component="span" sx={{ color: "#0f172a", fontWeight: 700 }}>{money(totalValue)}</Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<ShoppingCartOutlined />}
              disabled={addingAll || inStockBooks.length === 0}
              onClick={handleAddAll}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#4f46e5", px: 2.5, py: 1.2, "&:hover": { bgcolor: "#4338ca" } }}
            >
              {addingAll ? "Adding..." : "Add all available to cart"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchWishlist}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, color: "#475569", borderColor: "#cbd5e1" }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* ================= PRODUCT GRID ================= */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
          }}
        >
          {books.map((book, index) => {
            const bookId = book._id;
            const price = priceOf(book);
            const oldPrice = book.discountPrice ? Number(book.price) : null;
            const discount =
              oldPrice && price && oldPrice > price
                ? Math.round(((oldPrice - price) / oldPrice) * 100)
                : 0;

            const stock = Number(book.stock || 0);
            const outOfStock = stock <= 0;
            const lowStock = stock > 0 && stock <= 5;

            return (
              <Card
                key={bookId || index}
                elevation={0}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 3,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  bgcolor: "#fff",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                {/* Remove Button Overlay */}
                <IconButton
                  size="small"
                  aria-label="Remove from wishlist"
                  disabled={removingId === bookId}
                  onClick={() => handleRemove(bookId)}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    color: "#ef4444",
                    zIndex: 2,
                    "&:hover": { bgcolor: "#fee2e2" },
                  }}
                >
                  {removingId === bookId ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Favorite fontSize="small" />
                  )}
                </IconButton>

                {/* Discount Chip */}
                {discount > 0 && (
                  <Chip
                    label={`${discount}% OFF`}
                    color="error"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      fontWeight: 700,
                      fontSize: "10px",
                      height: 20,
                      zIndex: 2,
                    }}
                  />
                )}

                {/* Thumbnail */}
                <Box onClick={() => navigate(`/books/${bookId}`)} sx={{ cursor: "pointer" }}>
                  <Thumb book={book} />
                </Box>

                {/* Content */}
                <CardContent sx={{ flexGrow: 1, p: 2, pb: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "12px", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.5px" }}
                    noWrap
                  >
                    {book.category || "General"}
                  </Typography>

                  <Typography
                    fontWeight={700}
                    onClick={() => navigate(`/books/${bookId}`)}
                    sx={{
                      color: "#0f172a",
                      cursor: "pointer",
                      fontSize: "15px",
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      mb: 0.5,
                      "&:hover": { color: "#4f46e5" },
                    }}
                  >
                    {book.title || "Untitled book"}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px", mb: 1.5 }} noWrap>
                    {book.author ? `by ${book.author}` : ""}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
                    <Typography fontWeight={800} fontSize="17px" color="#0f172a">
                      {money(price)}
                    </Typography>
                    {oldPrice && oldPrice > price && (
                      <Typography
                        sx={{ color: "#94a3b8", textDecoration: "line-through", fontSize: "13px" }}
                      >
                        {money(oldPrice)}
                      </Typography>
                    )}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: outOfStock ? "#dc2626" : lowStock ? "#d97706" : "#16a34a",
                    }}
                  >
                    {outOfStock ? "Out of stock" : lowStock ? `Only ${stock} left in stock` : "In stock"}
                  </Typography>
                </CardContent>

                <Divider sx={{ borderColor: "#f1f5f9" }} />

                {/* Actions */}
                <CardActions sx={{ p: 2, pt: 1.5, gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    startIcon={<ShoppingCartOutlined />}
                    disabled={outOfStock || cartLoadingId === bookId}
                    onClick={() => handleAddToCart(book)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2,
                      bgcolor: "#4f46e5",
                      "&:hover": { bgcolor: "#4338ca" },
                    }}
                  >
                    {cartLoadingId === bookId ? "Adding..." : outOfStock ? "Unavailable" : "Add to Cart"}
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}

export default Wishlist;