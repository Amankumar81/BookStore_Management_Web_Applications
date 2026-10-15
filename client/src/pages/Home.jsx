import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";

import {
  ArrowForward,
  ChevronLeft,
  ChevronRight,
  ShoppingCartOutlined,
  MenuBook,
  AutoStories,
  LocalShippingOutlined,
  SecurityOutlined,
  FavoriteBorder,
} from "@mui/icons-material";

import Navbar from "../components/Navbar";
import HeroSlider from "../components/HeroSlider";
import { addToCart } from "../store/slices/cartSlice";
import useRequireLogin from "../hooks/useRequireLogin";
import usePendingAction from "../hooks/usePendingAction";

const API_BASE_URL = "https://bookstore-management-web-applications.onrender.com";

const WIDE = {
  maxWidth: 1600,
  mx: "auto",
  px: { xs: 2, md: 4, lg: 6 },
};

// All categories supported by the bookstore.
const CATEGORIES = [
  { name: "Programming", icon: "💻", from: "#dbeafe", to: "#bfdbfe" },
  { name: "Novel", icon: "📚", from: "#e0f2fe", to: "#bae6fd" },
  { name: "Science", icon: "🔬", from: "#ede9fe", to: "#ddd6fe" },
  { name: "History", icon: "📜", from: "#fef9c3", to: "#fde68a" },
  { name: "Biography", icon: "🏛️", from: "#ffedd5", to: "#fed7aa" },
  { name: "Business", icon: "💼", from: "#fef3c7", to: "#fde68a" },
  { name: "Technology", icon: "⚙️", from: "#e2e8f0", to: "#cbd5e1" },
  { name: "Self Help", icon: "🌱", from: "#dcfce7", to: "#bbf7d0" },
  { name: "Fiction", icon: "📖", from: "#fce7f3", to: "#fbcfe8" },
  { name: "Other", icon: "📘", from: "#f3e8ff", to: "#e9d5ff" },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const priceOf = (book) =>
  Number(book.discountPrice || book.price || 0);

const discountOf = (book) =>
  book.price &&
  book.discountPrice &&
  Number(book.price) > Number(book.discountPrice)
    ? Math.round(
        ((Number(book.price) - Number(book.discountPrice)) /
          Number(book.price)) *
          100
      )
    : 0;

const createdTime = (book) =>
  book.createdAt
    ? new Date(book.createdAt).getTime()
    : parseInt(String(book._id).slice(0, 8), 16) * 1000 || 0;

const getImageUrl = (book) => {
  const raw =
    (typeof book?.image === "string"
      ? book.image
      : book?.image?.url) ||
    (typeof book?.images?.[0] === "string"
      ? book.images[0]
      : book?.images?.[0]?.url) ||
    "";

  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  return `${API_BASE_URL}/${raw.replace(/^\/+/, "")}`;
};

const normalizeCategory = (value) => {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (value && typeof value === "object") {
    return String(value.name || value.title || "")
      .trim()
      .toLowerCase();
  }

  return "";
};

function BookTile({ book, onAdd, adding, fluid = false }) {
  const [failed, setFailed] = useState(false);

  const src = getImageUrl(book);
  const discount = discountOf(book);
  const outOfStock = !(Number(book.stock) > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        width: fluid ? "auto" : { xs: 172, sm: 216 },
        flex: fluid ? undefined : "0 0 auto",
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
        component="div"
        onClick={() => {
          window.location.href = `/books/${book._id}`;
        }}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: { xs: 210, sm: 250 },
          bgcolor: "#f1f5f9",
          color: "#94a3b8",
          cursor: "pointer",
        }}
      >
        {src && !failed ? (
          <Box
            component="img"
            src={src}
            alt={book.title}
            onError={() => setFailed(true)}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              p: 1.5,
            }}
          />
        ) : (
          <MenuBook sx={{ fontSize: 40 }} />
        )}

        {discount > 0 && (
          <Chip
            label={`-${discount}%`}
            size="small"
            color="success"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              fontWeight: 800,
            }}
          />
        )}
      </Box>

      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", flex: 1 }}>
        <Typography
          component="div"
          onClick={() => {
            window.location.href = `/books/${book._id}`;
          }}
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
            cursor: "pointer",
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
            {adding
              ? "Adding..."
              : outOfStock
                ? "Unavailable"
                : "Add to cart"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

function Shelf({ title, subtitle, to, loading, books, onAdd, addingId }) {
  const navigate = useNavigate();
  const ref = useRef(null);

  const scroll = (direction) =>
    ref.current?.scrollBy({
      left: direction * ref.current.clientWidth * 0.8,
      behavior: "smooth",
    });

  return (
    <Box sx={{ ...WIDE, py: { xs: 4, md: 5 } }}>
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
          <Typography
            sx={{
              fontSize: { xs: 24, md: 32 },
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "-1px",
            }}
          >
            {title}
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            endIcon={<ArrowForward />}
            onClick={() => navigate(to)}
            sx={{
              color: "#111827",
              fontWeight: 700,
              textTransform: "none",
              mr: 1,
            }}
          >
            View all
          </Button>

          <IconButton
            aria-label={`Scroll ${title} left`}
            onClick={() => scroll(-1)}
            sx={{ border: "1px solid #cbd5e1", bgcolor: "#fff" }}
          >
            <ChevronLeft />
          </IconButton>

          <IconButton
            aria-label={`Scroll ${title} right`}
            onClick={() => scroll(1)}
            sx={{ border: "1px solid #cbd5e1", bgcolor: "#fff" }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={ref}
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
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                sx={{
                  flex: "0 0 auto",
                  width: { xs: 172, sm: 216 },
                }}
                height={400}
              />
            ))
          : books.map((book) => (
              <BookTile
                key={book._id}
                book={book}
                onAdd={onAdd}
                adding={addingId === book._id}
              />
            ))}
      </Box>
    </Box>
  );
}

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const requireLogin = useRequireLogin();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  // Dynamic Title Effect
  useEffect(() => {
    document.title = "BookStore - Discover Your Next Read";
  }, []);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/books?limit=1000`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load books");
        }

        setBooks(Array.isArray(data.books) ? data.books : []);
      } catch (error) {
        console.error("HOME BOOKS ERROR:", error);
        toast.error(error.message || "Failed to load books");
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  const getBooksByCategory = (categoryName) =>
    books.filter(
      (book) =>
        normalizeCategory(book.category) ===
        normalizeCategory(categoryName)
    );

  const bestSellers = [...books]
    .filter((book) => Number(book.sold || 0) > 0)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 12);

  const newArrivals = [...books]
    .sort((a, b) => createdTime(b) - createdTime(a))
    .slice(0, 12);

  const handleAddToCart = async (book) => {
    if (
      !requireLogin(null, {
        type: "cart",
        book: {
          _id: book._id,
          title: book.title,
        },
      })
    ) {
      return;
    }

    try {
      setAddingId(book._id);

      const result = await dispatch(
        addToCart({
          bookId: book._id,
          quantity: 1,
        })
      );

      if (addToCart.fulfilled.match(result)) {
        toast.success(`"${book.title}" added to cart`);
      } else {
        toast.error(
          result.payload ||
            result.error?.message ||
            "Failed to add book to cart"
        );
      }
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      toast.error(error.message || "Failed to add book to cart");
    } finally {
      setAddingId(null);
    }
  };

  usePendingAction({ cart: handleAddToCart });

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />

      {/* HERO */}
      <Box sx={{ width: "100%" }}>
        <HeroSlider />
      </Box>

      {/* SHOP BY CATEGORY */}
      <Box sx={{ ...WIDE, py: { xs: 4, md: 6 } }}>
        <Typography
          sx={{
            fontSize: { xs: 26, md: 36 },
            fontWeight: 900,
            color: "#111827",
            letterSpacing: "-1px",
          }}
        >
          Shop by category
        </Typography>

        <Typography sx={{ color: "#64748b", mt: 0.5, mb: 3 }}>
          Find books that match your interests.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
          }}
        >
          {CATEGORIES.map((category) => (
            <Box
              key={category.name}
              component="button"
              onClick={() =>
                navigate(
                  `/books?category=${encodeURIComponent(category.name)}`
                )
              }
              sx={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                minHeight: 150,
                borderRadius: 4,
                p: 2.5,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: `linear-gradient(135deg, ${category.from}, ${category.to})`,
                transition: "transform .2s, box-shadow .2s",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: "0 14px 30px rgba(15,23,42,.14)",
                },
                "&:focus-visible": {
                  outline: "3px solid #2563eb",
                  outlineOffset: 2,
                },
              }}
            >
              <Typography sx={{ fontSize: 38, lineHeight: 1 }}>
                {category.icon}
              </Typography>

              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 17,
                  color: "#111827",
                }}
              >
                {category.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* NEW ARRIVALS */}
      <Shelf
        title="New arrivals"
        subtitle="Fresh additions to the shelves."
        to="/books?sort=newest"
        loading={loading}
        books={newArrivals}
        onAdd={handleAddToCart}
        addingId={addingId}
      />

      {/* BEST SELLERS */}
      {(loading || bestSellers.length > 0) && (
        <Shelf
          title="Best sellers"
          subtitle="The books our readers buy the most."
          to="/books?sort=bestselling"
          loading={loading}
          books={bestSellers}
          onAdd={handleAddToCart}
          addingId={addingId}
        />
      )}

             {/* ALL CATEGORY BOOK SECTIONS */}
        {CATEGORIES.map((category) => {
           const categoryBooks = books.filter(
             (book) =>
               normalizeCategory(book.category) ===
               normalizeCategory(category.name)
           );
         
           if (categoryBooks.length === 0) {
             return null;
           }
         
           return (
             <Shelf
               key={category.name}
               title={`${category.name} Books`}
               subtitle={`Explore our ${category.name.toLowerCase()} collection.`}
               to={`/books?category=${encodeURIComponent(category.name)}`}
               loading={loading}
               books={categoryBooks}
               onAdd={handleAddToCart}
               addingId={addingId}
             />
           );
         })}

         
      {/* MAIN CTA */}
      <Box sx={{ ...WIDE, py: { xs: 6, md: 9 } }}>
        <Box
          sx={{
            borderRadius: 5,
            p: { xs: 4, md: 8 },
            textAlign: "center",
            color: "#fff",
            background: "linear-gradient(120deg, #2563eb 0%, #172554 100%)",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 30, md: 48 },
              fontWeight: 900,
              letterSpacing: "-1.5px",
              lineHeight: 1.05,
            }}
          >
            Your next favourite book is waiting.
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              color: "rgba(255,255,255,.8)",
              fontSize: 18,
            }}
          >
            Explore our catalogue and find books that inspire you.
          </Typography>

          <Button
            endIcon={<ArrowForward />}
            onClick={() => navigate("/books")}
            sx={{
              mt: 4,
              px: 4,
              py: 1.4,
              borderRadius: 2,
              bgcolor: "#fff",
              color: "#111827",
              fontWeight: 800,
              textTransform: "none",
              fontSize: 16,
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          >
            Browse all books
          </Button>
        </Box>
      </Box>

      {/* ABOUT BOOKSTORE */}
      <Box
        component="section"
        id="about-bookstore"
        sx={{
          bgcolor: "#fff",
          borderTop: "1px solid #e2e8f0",
          mt: 2,
        }}
      >
        <Box sx={{ ...WIDE, py: { xs: 6, md: 9 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "1.1fr 0.9fr",
              },
              gap: { xs: 4, md: 8 },
              alignItems: "center",
            }}
          >
            <Box>
              <Chip
                icon={<AutoStories />}
                label="ABOUT BOOKSTORE"
                sx={{
                  mb: 2.5,
                  bgcolor: "#dbeafe",
                  color: "#1d4ed8",
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  "& .MuiChip-icon": { color: "#1d4ed8" },
                }}
              />

              <Typography
                sx={{
                  fontSize: { xs: 30, md: 44 },
                  fontWeight: 900,
                  color: "#111827",
                  letterSpacing: "-1.5px",
                  lineHeight: 1.12,
                  mb: 2.5,
                }}
              >
                Every book opens a new world.
              </Typography>

              <Typography
                sx={{
                  color: "#475569",
                  fontSize: { xs: 15, md: 17 },
                  lineHeight: 1.9,
                  mb: 2,
                }}
              >
                Welcome to BookStore, your place to discover books, explore
                new ideas, and find your next great read. Whether you are
                interested in programming, fiction, business, science, or
                personal development, explore topics that inspire you.
              </Typography>

              <Typography
                sx={{
                  color: "#475569",
                  fontSize: { xs: 15, md: 17 },
                  lineHeight: 1.9,
                  mb: 3,
                }}
              >
                Our goal is to make browsing and buying books simple and
                convenient, from discovering your next read to following
                your order.
              </Typography>

              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => navigate("/books")}
                sx={{
                  bgcolor: "#2563eb",
                  color: "#fff",
                  borderRadius: 2,
                  px: 3,
                  py: 1.3,
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#1d4ed8",
                    boxShadow: "0 8px 20px rgba(37,99,235,.2)",
                  },
                }}
              >
                Explore our collection
              </Button>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                },
                gap: 2,
              }}
            >
              {[
                {
                  icon: <AutoStories />,
                  title: "Our Mission",
                  description:
                    "Help readers discover books, learn new skills, and enjoy reading.",
                  color: "#2563eb",
                  bg: "#eff6ff",
                },
                {
                  icon: <FavoriteBorder />,
                  title: "For Every Reader",
                  description:
                    "Explore different categories and find stories and ideas that match your interests.",
                  color: "#db2777",
                  bg: "#fdf2f8",
                },
                {
                  icon: <SecurityOutlined />,
                  title: "Convenient Shopping",
                  description:
                    "Enjoy a straightforward shopping experience with clear order information.",
                  color: "#059669",
                  bg: "#ecfdf5",
                },
                {
                  icon: <LocalShippingOutlined />,
                  title: "Order Tracking",
                  description:
                    "Check order status and delivery updates through your account.",
                  color: "#d97706",
                  bg: "#fffbeb",
                },
              ].map((item) => (
                <Paper
                  key={item.title}
                  elevation={0}
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    minHeight: 190,
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    transition: "transform .2s, box-shadow .2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 28px rgba(15,23,42,.08)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 3,
                      bgcolor: item.bg,
                      color: item.color,
                      mb: 2,
                      "& .MuiSvgIcon-root": { fontSize: 27 },
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#111827",
                      mb: 1,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      color: "#64748b",
                      fontSize: 13.5,
                      lineHeight: 1.8,
                    }}
                  >
                    {item.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>

          {/* CLOSING STRIP */}
          <Box
            sx={{
              mt: { xs: 5, md: 7 },
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              bgcolor: "#f1f5f9",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: 20, md: 24 },
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Find your next favourite read.
              </Typography>

              <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                Browse the shelves and start your next reading adventure.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              endIcon={<ArrowForward />}
              onClick={() => navigate("/books")}
              sx={{
                flexShrink: 0,
                borderColor: "#2563eb",
                color: "#2563eb",
                borderRadius: 2,
                px: 3,
                py: 1.2,
                fontWeight: 800,
                textTransform: "none",
                "&:hover": {
                  borderColor: "#1d4ed8",
                  bgcolor: "#dbeafe",
                },
              }}
            >
              Browse books
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Home;