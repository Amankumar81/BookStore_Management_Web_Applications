import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../store/slices/cartSlice";
import { toast } from "react-toastify";

import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Rating,
  Divider,
  CircularProgress,
  Chip,
  Paper,
} from "@mui/material";

import {
  Favorite,
  FavoriteBorder,
  ShoppingCartOutlined,
  Add,
  Remove,
  ArrowBack,
  ChevronLeft,
  ChevronRight,
  MenuBook,
} from "@mui/icons-material";

import { getBookById } from "../api/bookApi";

const API_BASE_URL = "http://localhost:5000";

// ============================================================
// Helpers
// ============================================================
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const priceOf = (b) => Number(b.discountPrice || b.price || 0);
const discountOf = (b) =>
  b.price && b.discountPrice && Number(b.price) > Number(b.discountPrice)
    ? Math.round(((b.price - b.discountPrice) / b.price) * 100)
    : 0;

// Supports image as a string, { url }, or images[0]
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

// ============================================================
// Related book card (same style as the Home page)
// ============================================================
function BookTile({ book, onAdd, adding }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(book);
  const discount = discountOf(book);
  const outOfStock = !(Number(book.stock) > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: 172, sm: 216 },
        flex: "0 0 auto",
        scrollSnapAlign: "start",
        border: "1px solid #e5e7eb",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow .2s, transform .2s",
        "&:hover": {
          boxShadow: "0 14px 32px rgba(15,23,42,.12)",
          transform: "translateY(-4px)",
        },
      }}
    >
      <Box
        component={Link}
        to={`/books/${book._id}`}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: { xs: 210, sm: 250 },
          bgcolor: "#f1f5f9",
          color: "#94a3b8",
        }}
      >
        {src && !failed ? (
          <Box
            component="img"
            src={src}
            alt={book.title}
            onError={() => setFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: "contain", p: 1.5 }}
          />
        ) : (
          <MenuBook sx={{ fontSize: 40 }} />
        )}

        {discount > 0 && (
          <Chip
            label={`-${discount}%`}
            size="small"
            color="success"
            sx={{ position: "absolute", top: 10, right: 10, fontWeight: 800 }}
          />
        )}
      </Box>

      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", flex: 1 }}>
        <Typography
          component={Link}
          to={`/books/${book._id}`}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontSize: 14.5,
            fontWeight: 700,
            lineHeight: 1.3,
            color: "#111827",
            textDecoration: "none",
            minHeight: 38,
            "&:hover": { color: "#2563eb" },
          }}
        >
          {book.title}
        </Typography>

        <Typography noWrap sx={{ color: "#64748b", fontSize: 12.5, mt: 0.25 }}>
          {book.author}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mt: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
            {money(priceOf(book))}
          </Typography>
          {discount > 0 && (
            <Typography
              sx={{
                color: "#94a3b8",
                textDecoration: "line-through",
                fontSize: 12.5,
              }}
            >
              {money(book.price)}
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: "auto", pt: 1.5 }}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            disableElevation
            startIcon={<ShoppingCartOutlined />}
            disabled={outOfStock || adding}
            onClick={() => onAdd(book)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: "#facc15",
              color: "#111827",
              "&:hover": { bgcolor: "#eab308" },
            }}
          >
            {adding ? "Adding..." : outOfStock ? "Unavailable" : "Add to cart"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================================
// Page
// ============================================================
function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const shelfRef = useRef(null);

  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingRelatedId, setAddingRelatedId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [mainImageFailed, setMainImageFailed] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // Dynamic Document Title
  // ==========================================
  useEffect(() => {
    if (book && book.title) {
      document.title = `${book.title} | Bookstore`;
    } else {
      document.title = "Book Details | Bookstore";
    }

    return () => {
      document.title = "My Bookstore";
    };
  }, [book]);

  // ==========================================
  // Get Book & Related Books
  // ==========================================
  useEffect(() => {
    const fetchBookData = async () => {
      try {
        setLoading(true);
        setError("");
        setMainImageFailed(false);
        setQuantity(1);

        const data = await getBookById(id);
        const currentBook = data.book;
        setBook(currentBook);

        // Related books: same category, not the current book
        try {
          const res = await fetch(`${API_BASE_URL}/api/books`);
          const allBooksData = await res.json();
          const all = allBooksData.books || allBooksData || [];

          const category = String(currentBook?.category || "").toLowerCase();

          const related = all
            .filter(
              (b) =>
                b._id !== currentBook._id &&
                String(b.category || "").toLowerCase() === category
            )
            .slice(0, 12);

          setRelatedBooks(related);
        } catch (relErr) {
          console.error("RELATED BOOKS ERROR:", relErr);
          setRelatedBooks([]);
        }
      } catch (err) {
        console.error("BOOK DETAILS ERROR:", err);
        setError(err.response?.data?.message || "Unable to load book details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  // ==========================================
  // Check Wishlist
  // ==========================================
  useEffect(() => {
    const checkWishlist = async () => {
      const token = localStorage.getItem("token");
      if (!token || !id) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await response.text();
        if (!response.ok) {
          setIsWishlisted(false);
          return;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          setIsWishlisted(false);
          return;
        }

        setIsWishlisted(JSON.stringify(data).includes(String(id)));
      } catch (error) {
        setIsWishlisted(false);
      }
    };

    checkWishlist();
  }, [id]);

  // ==========================================
  // Toggle Wishlist
  // ==========================================
  const handleWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to use wishlist");
      navigate("/login");
      return;
    }

    if (!book) {
      toast.error("Book not available");
      return;
    }

    try {
      setWishlistLoading(true);

      if (isWishlisted) {
        const response = await fetch(`${API_BASE_URL}/api/wishlist/${book._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to remove from wishlist");

        setIsWishlisted(false);
        toast.success("Removed from wishlist");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookId: book._id }),
      });

      if (!response.ok) throw new Error("Failed to add to wishlist");

      setIsWishlisted(true);
      toast.success("Added to wishlist ❤️");
    } catch (error) {
      toast.error(error.message || "Wishlist operation failed");
    } finally {
      setWishlistLoading(false);
    }
  };

  // ==========================================
  // Quantity
  // ==========================================
  const increaseQuantity = () => {
    if (!book) return;
    if (quantity < book.stock) {
      setQuantity((prev) => prev + 1);
    } else {
      toast.info(`Only ${book.stock} items available`);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // ==========================================
  // Add to cart (main book)
  // ==========================================
  const handleAddToCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add books to cart");
      navigate("/login");
      return;
    }

    if (!book || book.stock <= 0) {
      toast.error("Book is out of stock");
      return;
    }

    try {
      setAddingToCart(true);
      const result = await dispatch(addToCart({ bookId: book._id, quantity }));

      if (addToCart.fulfilled.match(result)) {
        toast.success(`${quantity} ${quantity === 1 ? "book" : "books"} added to cart`);
        setQuantity(1);
      } else {
        throw new Error(result.payload || result.error?.message || "Failed to add book to cart");
      }
    } catch (error) {
      toast.error(error.message || "Failed to add book to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  // ==========================================
  // Add to cart (related book)
  // ==========================================
  const handleAddRelated = async (item) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add books to cart");
      navigate("/login");
      return;
    }

    try {
      setAddingRelatedId(item._id);
      const result = await dispatch(addToCart({ bookId: item._id, quantity: 1 }));

      if (addToCart.fulfilled.match(result)) {
        toast.success(`"${item.title}" added to cart`);
      } else {
        throw new Error(result.payload || result.error?.message || "Failed to add book to cart");
      }
    } catch (error) {
      toast.error(error.message || "Failed to add book to cart");
    } finally {
      setAddingRelatedId(null);
    }
  };

  const scrollShelf = (dir) =>
    shelfRef.current?.scrollBy({
      left: dir * shelfRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });

  // ==========================================
  // States
  // ==========================================
  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography color="error" textAlign="center" fontWeight={700}>
          {error}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button component={Link} to="/books" variant="contained">
            Back to Books
          </Button>
        </Box>
      </Container>
    );
  }

  if (!book) {
    return (
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography textAlign="center">Book not found.</Typography>
      </Container>
    );
  }

  const discount = discountOf(book);
  const mainImage = getImageUrl(book);

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 4 } }}>
        <Button
          component={Link}
          to="/books"
          startIcon={<ArrowBack />}
          sx={{ mb: 3, color: "#475569", textTransform: "none", fontWeight: 600 }}
        >
          Back to Books
        </Button>

        {/* Main Book Card */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
            overflow: "hidden",
            p: { xs: 3, md: 5 },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr" },
              gap: { xs: 3, md: 6 },
              alignItems: "center",
            }}
          >
            {/* IMAGE */}
            <Box
              sx={{
                height: { xs: 320, md: 450 },
                backgroundColor: "#f8fafc",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                color: "#94a3b8",
              }}
            >
              {mainImage && !mainImageFailed ? (
                <Box
                  component="img"
                  src={mainImage}
                  alt={book.title}
                  onError={() => setMainImageFailed(true)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    maxHeight: 410,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <MenuBook sx={{ fontSize: 72 }} />
              )}
            </Box>

            {/* DETAILS */}
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
              <Chip
                label={book.category || "Book"}
                size="small"
                sx={{ mb: 1.5, width: "fit-content", backgroundColor: "#f1f5f9", fontWeight: 700 }}
              />

              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: "#111827", fontSize: { xs: 24, md: 34 }, lineHeight: 1.2 }}
              >
                {book.title}
              </Typography>

              <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 16 }}>
                by <strong>{book.author}</strong>
              </Typography>

              {/* RATING */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                <Rating value={book.averageRating || 0} precision={0.5} readOnly size="small" />
                <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                  ({book.totalReviews || 0} reviews)
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* PRICE */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 30, fontWeight: 800, color: "#111827" }}>
                  {money(priceOf(book))}
                </Typography>

                {discount > 0 && (
                  <>
                    <Typography sx={{ fontSize: 16, color: "#94a3b8", textDecoration: "line-through" }}>
                      {money(book.price)}
                    </Typography>
                    <Chip label={`${discount}% OFF`} color="success" size="small" />
                  </>
                )}
              </Box>

              <Typography
                sx={{
                  mt: 1,
                  color: book.stock > 0 ? "#16a34a" : "#dc2626",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {book.stock > 0 ? `${book.stock} items available` : "Out of stock"}
              </Typography>

              {/* QUANTITY */}
              {book.stock > 0 && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Qty:</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                    <IconButton size="small" onClick={decreaseQuantity} disabled={quantity <= 1}>
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography sx={{ width: 35, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                      {quantity}
                    </Typography>
                    <IconButton size="small" onClick={increaseQuantity} disabled={quantity >= book.stock}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* ACTIONS */}
              <Box sx={{ display: "flex", gap: 1.5, mt: 3, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<ShoppingCartOutlined />}
                  onClick={handleAddToCart}
                  disabled={book.stock <= 0 || addingToCart}
                  sx={{
                    flex: 1,
                    py: 1.2,
                    borderRadius: 2,
                    backgroundColor: "#111827",
                    textTransform: "none",
                    fontWeight: 700,
                    "&:hover": { backgroundColor: "#000" },
                  }}
                >
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </Button>

                <IconButton
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                  sx={{
                    border: isWishlisted ? "1px solid #fecdd3" : "1px solid #e2e8f0",
                    borderRadius: 2,
                    width: 46,
                    height: 46,
                    color: isWishlisted ? "#e11d48" : "#64748b",
                    backgroundColor: isWishlisted ? "#ffe4e6" : "#fff",
                    "&:hover": { backgroundColor: "#ffe4e6", color: "#e11d48" },
                  }}
                >
                  {wishlistLoading ? (
                    <CircularProgress size={18} />
                  ) : isWishlisted ? (
                    <Favorite />
                  ) : (
                    <FavoriteBorder />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* BOOK INFO SPECS */}
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>Book Information</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              color: "#64748b",
              fontSize: 13,
              backgroundColor: "#f8fafc",
              p: 2,
              borderRadius: 2,
            }}
          >
            <Box>ISBN: <strong style={{ color: "#111827" }}>{book.isbn || "N/A"}</strong></Box>
            <Box>Language: <strong style={{ color: "#111827" }}>{book.language || "N/A"}</strong></Box>
          </Box>
        </Box>

        {/* ==========================================
            RELATED BOOKS (same style as Home)
        ========================================== */}
        {relatedBooks.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                mb: 3,
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                  More in {book.category}
                </Typography>
                <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                  Other readers also looked at these books.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  onClick={() =>
                    navigate(`/books?category=${encodeURIComponent(book.category)}`)
                  }
                  sx={{ color: "#111827", fontWeight: 700, textTransform: "none", mr: 1 }}
                >
                  View all
                </Button>
                <IconButton
                  aria-label="Scroll left"
                  onClick={() => scrollShelf(-1)}
                  sx={{ border: "1px solid #cbd5e1", bgcolor: "#fff" }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  aria-label="Scroll right"
                  onClick={() => scrollShelf(1)}
                  sx={{ border: "1px solid #cbd5e1", bgcolor: "#fff" }}
                >
                  <ChevronRight />
                </IconButton>
              </Box>
            </Box>

            <Box
              ref={shelfRef}
              sx={{
                display: "flex",
                gap: 2.5,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                pb: 2,
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {relatedBooks.map((item) => (
                <BookTile
                  key={item._id}
                  book={item}
                  onAdd={handleAddRelated}
                  adding={addingRelatedId === item._id}
                />
              ))}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default BookDetails;
