import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import {
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import {
  FilterList,
  GridView,
  ViewList,
  ShoppingCartOutlined,
  Close,
  MenuBook,
} from "@mui/icons-material";

import Navbar from "../components/Navbar";
import { addToCart } from "../store/slices/cartSlice";
import useRequireLogin from "../hooks/useRequireLogin";
import usePendingAction from "../hooks/usePendingAction";

const API_BASE_URL = "http://localhost:5000";
// Books per page the user can choose from
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_MAX_PRICE = 2000;

// All supported bookstore categories
const CATEGORIES = [
  "Programming",
  "Novel",
  "Science",
  "History",
  "Biography",
  "Business",
  "Technology",
  "Self Help",
  "Fiction",
  "Other",
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
  { value: "bestselling", label: "Best selling" },
  { value: "newest", label: "Newest first" },
  { value: "discount", label: "Biggest discount" },
  { value: "title", label: "Title: A to Z" },
];

const DISCOUNT_OPTIONS = [
  { value: 0, label: "Any discount" },
  { value: 10, label: "10% off or more" },
  { value: 25, label: "25% off or more" },
  { value: 40, label: "40% off or more" },
];

// ============================================================
// Helpers
// ============================================================
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const priceOf = (b) => Number(b.discountPrice || b.price || 0);

const discountOf = (b) =>
  b.price && b.discountPrice && Number(b.price) > Number(b.discountPrice)
    ? Math.round(((b.price - b.discountPrice) / b.price) * 100)
    : 0;

// Normalize category names for consistent matching
const normalizeCategory = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

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
// Cover image with fallback
// ============================================================
const Cover = ({ book, height, width = "100%" }) => {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(book);

  return (
    <Box
      sx={{
        width,
        height,
        bgcolor: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        flexShrink: 0,
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
    </Box>
  );
};

// ============================================================
// Book card (grid or list layout)
// ============================================================
const BookCard = ({ book, view, onAdd, adding }) => {
  const navigate = useNavigate();
  const openBook = () => navigate(`/books/${book._id}`);

  const price = priceOf(book);
  const discount = discountOf(book);
  const stock = Number(book.stock || 0);
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 5;

  const stockLabel = outOfStock
    ? "Out of stock"
    : lowStock
      ? `Only ${stock} left`
      : "In stock";

  const stockColor = outOfStock
    ? "#dc2626"
    : lowStock
      ? "#d97706"
      : "#16a34a";

  const details = (
    <>
      <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
        {book.category || "Book"}
      </Typography>

      <Typography
        className="book-title"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.3,
          color: "#111827",
          mt: 0.25,
        }}
      >
        {book.title}
      </Typography>

      <Typography sx={{ color: "#64748b", fontSize: 13, mt: 0.5 }}>
        by <strong>{book.author}</strong>
      </Typography>
    </>
  );

  const priceBlock = (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
        {money(price)}
      </Typography>

      {discount > 0 && (
        <>
          <Typography
            sx={{
              color: "#94a3b8",
              textDecoration: "line-through",
              fontSize: 13,
            }}
          >
            {money(book.price)}
          </Typography>

          <Typography sx={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
            {discount}% off
          </Typography>
        </>
      )}
    </Box>
  );

  const actions = (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexDirection: view === "list" ? "column" : "row",
      }}
    >
      <Button
        fullWidth
        variant="contained"
        disableElevation
        startIcon={<ShoppingCartOutlined />}
        disabled={outOfStock || adding}
        onClick={(e) => {
          e.stopPropagation();
          onAdd(book);
        }}
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
  );

  const cardSx = {
    border: "1px solid #e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    bgcolor: "#fff",
    cursor: "pointer",
    transition: "box-shadow .2s, border-color .2s",
    "&:hover": {
      boxShadow: "0 10px 28px rgba(15,23,42,0.09)",
      borderColor: "#cbd5e1",
    },
    "&:hover .book-title": { color: "#2563eb" },
    "&:focus-visible": { outline: "3px solid #2563eb", outlineOffset: 2 },
  };

  // Makes the whole card behave like a link (mouse and keyboard)
  const cardProps = {
    elevation: 0,
    role: "link",
    tabIndex: 0,
    "aria-label": `View details for ${book.title}`,
    onClick: openBook,
    onKeyDown: (e) => {
      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openBook();
      }
    },
  };

  // ---------- LIST VIEW ----------
  if (view === "list") {
    return (
      <Paper
        {...cardProps}
        sx={{
          ...cardSx,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: { xs: "100%", sm: 170 },
            flexShrink: 0,
          }}
        >
          <Cover book={book} height={{ xs: 220, sm: "100%" }} />

          {discount > 0 && (
            <Chip
              label={`-${discount}%`}
              size="small"
              color="success"
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                fontWeight: 800,
              }}
            />
          )}
        </Box>

        <Box sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
          {details}

          {book.description && (
            <Typography
              sx={{
                mt: 1,
                fontSize: 13.5,
                color: "#475569",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {book.description}
            </Typography>
          )}

          <Typography
            sx={{ mt: 1, fontSize: 13, fontWeight: 700, color: stockColor }}
          >
            {stockLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2.5,
            width: { xs: "100%", sm: 210 },
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 1.5,
            borderLeft: { sm: "1px solid #eef2f6" },
          }}
        >
          {priceBlock}
          {actions}
        </Box>
      </Paper>
    );
  }

  // ---------- GRID VIEW ----------
  return (
    <Paper
      {...cardProps}
      sx={{
        ...cardSx,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Cover book={book} height={260} />

        {discount > 0 && (
          <Chip
            label={`-${discount}%`}
            size="small"
            color="success"
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              fontWeight: 800,
            }}
          />
        )}
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", flex: 1 }}>
        {details}

        <Box sx={{ mt: 1.5 }}>{priceBlock}</Box>

        <Typography
          sx={{ mt: 0.5, fontSize: 12.5, fontWeight: 700, color: stockColor }}
        >
          {stockLabel}
        </Typography>

        <Box sx={{ mt: "auto", pt: 2 }}>{actions}</Box>
      </Box>
    </Paper>
  );
};

// ============================================================
// Page
// ============================================================
function Books() {
  const dispatch = useDispatch();
  const requireLogin = useRequireLogin();
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // All filters live in the URL, so links can be shared and survive a refresh
  const category = searchParams.get("category") || "all";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "featured";
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const inStockOnly = searchParams.get("inStock") === "true";
  const minDiscount = Number(searchParams.get("discount") || 0);

  // Books per page: 25 (default), 50 or 100, kept in the URL as ?perPage=50
  const perPageParam = Number(searchParams.get("perPage"));
  const pageSize = PAGE_SIZE_OPTIONS.includes(perPageParam)
    ? perPageParam
    : PAGE_SIZE_OPTIONS[0];

  // Slider position while dragging (saved to the URL when released)
  const [sliderValue, setSliderValue] = useState(null);

  // Other page state
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addingId, setAddingId] = useState(null);

  // ------------------------------------------------------------
  // Load books
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError("");

        // limit=1000 so filters work on the whole catalogue, not just the first page
        const response = await fetch(`${API_BASE_URL}/api/books?limit=1000`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load books");
        }

        setBooks(data.books || []);
      } catch (err) {
        console.error("BOOKS ERROR:", err);
        setError(err.message || "Unable to load books.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // ------------------------------------------------------------
  // URL param helpers
  // ------------------------------------------------------------
  const setParam = (key, value, defaultValue) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  // Change several params at once. Empty values remove the param.
  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === false
      ) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  };

  // ------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------

  // Price slider: ends at ₹2000, or at the highest book price if that is more
  const bounds = useMemo(() => {
    const highest = books.length
      ? Math.ceil(Math.max(...books.map(priceOf)))
      : 0;

    return {
      min: 0,
      max: Math.max(DEFAULT_MAX_PRICE, highest),
    };
  }, [books]);

  const range = [
    minPriceParam !== null
      ? Math.max(bounds.min, Number(minPriceParam))
      : bounds.min,
    maxPriceParam !== null
      ? Math.min(bounds.max, Number(maxPriceParam))
      : bounds.max,
  ];

  const priceActive = range[0] > bounds.min || range[1] < bounds.max;
  const sliderRange = sliderValue || range;

  // All requested categories plus any extra categories found in the database.
  // Matching is case-insensitive and ignores leading/trailing/repeated spaces.
  const categoryList = useMemo(() => {
    const map = new Map();

    CATEGORIES.forEach((name) => {
      map.set(normalizeCategory(name), name);
    });

    books.forEach((book) => {
      const name = String(book.category || "")
        .trim()
        .replace(/\s+/g, " ");

      const normalized = normalizeCategory(name);

      if (normalized && !map.has(normalized)) {
        map.set(normalized, name);
      }
    });

    return [...map.values()];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = books.filter((b) => {
      if (
        category !== "all" &&
        normalizeCategory(b.category) !== normalizeCategory(category)
      ) {
        return false;
      }

      if (
        q &&
        ![b.title, b.author, b.category, b.isbn]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      ) {
        return false;
      }

      const p = priceOf(b);
      if (p < range[0] || p > range[1]) return false;
      if (inStockOnly && !(Number(b.stock) > 0)) return false;
      if (minDiscount > 0 && discountOf(b) < minDiscount) return false;
      if (sort === "bestselling" && !(Number(b.sold) > 0)) return false;

      return true;
    });

    const by = (fn) => [...list].sort(fn);

    if (sort === "priceLow") list = by((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "priceHigh")
      list = by((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "bestselling")
      list = by((a, b) => Number(b.sold || 0) - Number(a.sold || 0));
    else if (sort === "newest")
      list = by(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    else if (sort === "discount")
      list = by((a, b) => discountOf(b) - discountOf(a));
    else if (sort === "title")
      list = by((a, b) => String(a.title).localeCompare(String(b.title)));

    return list;
  }, [
    books,
    category,
    search,
    sort,
    range[0],
    range[1],
    inStockOnly,
    minDiscount,
  ]);

  // Back to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [
    category,
    search,
    sort,
    minPriceParam,
    maxPriceParam,
    inStockOnly,
    minDiscount,
    pageSize,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBooks.length / pageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageBooks = filteredBooks.slice(start, start + pageSize);

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ------------------------------------------------------------
  // Active filters
  // ------------------------------------------------------------
  const activeChips = [];

  if (category !== "all") {
    activeChips.push({
      key: "category",
      label: category,
      clear: () => updateParams({ category: "" }),
    });
  }

  if (search) {
    activeChips.push({
      key: "search",
      label: `"${search}"`,
      clear: () => updateParams({ search: "" }),
    });
  }

  if (priceActive) {
    activeChips.push({
      key: "price",
      label: `${money(range[0])} - ${money(range[1])}`,
      clear: () => updateParams({ minPrice: "", maxPrice: "" }),
    });
  }

  if (inStockOnly) {
    activeChips.push({
      key: "stock",
      label: "In stock only",
      clear: () => updateParams({ inStock: "" }),
    });
  }

  if (minDiscount > 0) {
    activeChips.push({
      key: "discount",
      label: `${minDiscount}% off or more`,
      clear: () => updateParams({ discount: "" }),
    });
  }

  const clearAll = () => {
    setSearchParams(sort !== "featured" ? { sort } : {});
    setSliderValue(null);
  };

  // ------------------------------------------------------------
  // Add to cart
  // ------------------------------------------------------------
  const handleAddToCart = async (book) => {
    if (
      !requireLogin(null, {
        type: "cart",
        book: { _id: book._id, title: book.title },
      })
    ) {
      return;
    }

    try {
      setAddingId(book._id);

      const result = await dispatch(
        addToCart({ bookId: book._id, quantity: 1 })
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

  // After login: add the book the user wanted
  usePendingAction({ cart: handleAddToCart });

  // ------------------------------------------------------------
  // Filter panel (used in the sidebar and in the mobile drawer)
  // ------------------------------------------------------------
  const filterPanel = (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography fontWeight={800} fontSize={17}>
          Filters
        </Typography>

        {activeChips.length > 0 && (
          <Button
            size="small"
            onClick={clearAll}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Clear all
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Category */}
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>
        Category
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", mb: 2 }}>
        {["all", ...categoryList].map((name) => {
          const active =
            normalizeCategory(category) === normalizeCategory(name);

          return (
            <Box
              key={name}
              onClick={() =>
                updateParams({ category: name === "all" ? "" : name })
              }
              sx={{
                py: 0.7,
                px: 1,
                borderRadius: 1.5,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 800 : 500,
                color: active ? "#2563eb" : "#334155",
                bgcolor: active ? "#eff6ff" : "transparent",
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              {name === "all" ? "All books" : name}
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Price */}
      <Typography fontWeight={700} fontSize={14}>
        Price
      </Typography>

      <Box sx={{ px: 1.5 }}>
        <Slider
          size="small"
          value={sliderRange}
          min={bounds.min}
          max={bounds.max}
          onChange={(_, v) => setSliderValue(v)}
          onChangeCommitted={(_, v) => {
            updateParams({
              minPrice: v[0] > bounds.min ? v[0] : "",
              maxPrice: v[1] < bounds.max ? v[1] : "",
            });
            setSliderValue(null);
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={money}
          disableSwap
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#64748b",
          mb: 2,
        }}
      >
        <span>{money(sliderRange[0])}</span>
        <span>{money(sliderRange[1])}</span>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Discount */}
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 0.5 }}>
        Discount
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", mb: 2 }}>
        {DISCOUNT_OPTIONS.map((o) => (
          <Box
            key={o.value}
            onClick={() => updateParams({ discount: o.value || "" })}
            sx={{
              py: 0.6,
              px: 1,
              borderRadius: 1.5,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: minDiscount === o.value ? 800 : 500,
              color: minDiscount === o.value ? "#2563eb" : "#334155",
              bgcolor: minDiscount === o.value ? "#eff6ff" : "transparent",
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            {o.label}
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 1 }} />

      {/* Availability */}
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={inStockOnly}
            onChange={(e) =>
              updateParams({ inStock: e.target.checked ? "true" : "" })
            }
          />
        }
        label={<Typography fontSize={14}>Show in-stock books only</Typography>}
      />
    </Box>
  );

  const heading =
    sort === "bestselling" && category === "all" && !search
      ? "Best Sellers"
      : category !== "all"
        ? category
        : search
          ? `Results for "${search}"`
          : "All Books";

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />

      <Container
        maxWidth={false}
        sx={{
          maxWidth: 1400,
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        {/* Heading */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: { xs: 28, md: 38 },
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "-1px",
            }}
          >
            {heading}
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            Browse, filter and sort the full catalogue.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "260px minmax(0, 1fr)",
            },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Sidebar (desktop) */}
          <Paper
            elevation={0}
            sx={{
              display: { xs: "none", md: "block" },
              position: "sticky",
              top: 90,
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e5e7eb",
              maxHeight: "calc(100vh - 110px)",
              overflowY: "auto",
            }}
          >
            {filterPanel}
          </Paper>

          {/* Results */}
          <Box sx={{ minWidth: 0 }}>
            {/* Toolbar */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                px: 2,
                mb: 2,
                borderRadius: 3,
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  startIcon={<FilterList />}
                  onClick={() => setFiltersOpen(true)}
                  sx={{
                    display: { xs: "inline-flex", md: "none" },
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Filters
                  {activeChips.length > 0 ? ` (${activeChips.length})` : ""}
                </Button>

                <Typography sx={{ fontSize: 14, color: "#475569" }}>
                  {loading
                    ? "Loading books..."
                    : filteredBooks.length === 0
                      ? "0 results"
                      : `${start + 1}-${Math.min(
                          start + pageSize,
                          filteredBooks.length
                        )} of ${filteredBooks.length} results`}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Select
                  size="small"
                  value={pageSize}
                  onChange={(e) =>
                    setParam("perPage", String(e.target.value), "25")
                  }
                  sx={{ minWidth: 120, fontSize: 14 }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      Show: {n}
                    </MenuItem>
                  ))}
                </Select>

                <Select
                  size="small"
                  value={sort}
                  onChange={(e) =>
                    setParam("sort", e.target.value, "featured")
                  }
                  sx={{ minWidth: 190, fontSize: 14 }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      Sort: {o.label}
                    </MenuItem>
                  ))}
                </Select>

                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={view}
                  onChange={(_, v) => v && setView(v)}
                >
                  <ToggleButton value="grid" aria-label="Grid view">
                    <GridView fontSize="small" />
                  </ToggleButton>

                  <ToggleButton value="list" aria-label="List view">
                    <ViewList fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Paper>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {activeChips.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    onDelete={c.clear}
                    sx={{ fontWeight: 600 }}
                  />
                ))}

                <Button
                  size="small"
                  onClick={clearAll}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Clear all
                </Button>
              </Box>
            )}

            {/* Loading skeleton */}
            {loading && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                    xl: "repeat(4, 1fr)",
                  },
                  gap: 2.5,
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={460} />
                ))}
              </Box>
            )}

            {/* Error */}
            {!loading && error && (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography color="error" fontWeight={700}>
                  {error}
                </Typography>

                <Typography sx={{ mt: 1, color: "#64748b" }}>
                  Make sure your backend server is running on port 5000.
                </Typography>
              </Box>
            )}

            {/* Empty */}
            {!loading && !error && filteredBooks.length === 0 && (
              <Paper
                elevation={0}
                sx={{
                  textAlign: "center",
                  py: 9,
                  px: 3,
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                }}
              >
                <Typography
                  sx={{ fontSize: 22, fontWeight: 800, color: "#111827" }}
                >
                  {books.length === 0
                    ? "No books available"
                    : "No books match your filters"}
                </Typography>

                <Typography sx={{ mt: 1, color: "#64748b" }}>
                  {books.length === 0
                    ? "Please check back later."
                    : "Try a different search or remove some filters."}
                </Typography>

                {books.length > 0 && (
                  <Button
                    variant="contained"
                    onClick={clearAll}
                    sx={{
                      mt: 3,
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </Paper>
            )}

            {/* Results grid or list */}
            {!loading && !error && pageBooks.length > 0 && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2.5,
                    gridTemplateColumns:
                      view === "grid"
                        ? {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                            lg: "repeat(3, 1fr)",
                            xl: "repeat(4, 1fr)",
                          }
                        : "1fr",
                  }}
                >
                  {pageBooks.map((book) => (
                    <BookCard
                      key={book._id}
                      book={book}
                      view={view}
                      onAdd={handleAddToCart}
                      adding={addingId === book._id}
                    />
                  ))}
                </Box>

                {totalPages > 1 && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 5 }}
                  >
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      shape="rounded"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Container>

      {/* Mobile filter drawer */}
      <Drawer
        anchor="left"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      >
        <Box sx={{ width: 300, p: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <Close />
            </IconButton>
          </Box>

          {filterPanel}

          <Button
            fullWidth
            variant="contained"
            onClick={() => setFiltersOpen(false)}
            sx={{
              mt: 3,
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
            }}
          >
            Show {filteredBooks.length} results
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}

export default Books;
