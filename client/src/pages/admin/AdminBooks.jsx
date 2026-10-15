
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Checkbox,
  Card,
  CardContent,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";
const LOW_STOCK_LIMIT = 5;
const BOOKS_PER_PAGE = 10;

const categories = [
  "Programming",
  "Novel",
  "Science",
  "History",
  "Biography",
  "Business",
  "Technology",
  "Other",
];

// =========================
// DATE GROUPING HELPERS
// =========================
const getLocalDateKey = (value) => {
  if (!value) return "unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unknown";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDayOffset = (dateKey) => {
  if (dateKey === "unknown") return null;

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, day);

  return Math.round((target - today) / 86400000);
};

const getDateGroupTitle = (dateKey) => {
  const offset = getDayOffset(dateKey);

  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  if (offset === 1) return "Tomorrow";
  if (offset === null) return "Date not available";

  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getBookDateKey = (book) => getLocalDateKey(book.createdAt);

const compareBookDates = (a, b) => {
  const aKey = getBookDateKey(a);
  const bKey = getBookDateKey(b);

  if (aKey === "unknown" && bKey !== "unknown") return 1;
  if (bKey === "unknown" && aKey !== "unknown") return -1;

  // Newest date first.
  return bKey.localeCompare(aKey);
};

// =========================
// STOCK STATUS
// =========================
const getStockStatus = (stock) => {
  const quantity = Number(stock || 0);

  if (quantity <= 0) return "Out of Stock";
  if (quantity <= LOW_STOCK_LIMIT) return "Low Stock";

  return "In Stock";
};

const getStockChip = (stock) => {
  const status = getStockStatus(stock);

  const color =
    status === "Out of Stock"
      ? "error"
      : status === "Low Stock"
        ? "warning"
        : "success";

  return <Chip label={status} size="small" color={color} />;
};

function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState("");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);

  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  // =========================
  // FETCH BOOKS
  // =========================
  const fetchBooks = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch books");
      }

      setBooks(Array.isArray(data.books) ? data.books : []);
      setSelectedBooks([]);
    } catch (err) {
      console.error("Admin books error:", err);
      setError(err.message || "Failed to fetch books.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // =========================
  // DELETE SINGLE BOOK
  // =========================
  const handleDelete = async (bookId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this book?"
    );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(bookId);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/books/${bookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete book");
      }

      setBooks((current) =>
        current.filter((book) => book._id !== bookId)
      );

      setSelectedBooks((current) =>
        current.filter((id) => id !== bookId)
      );
    } catch (err) {
      console.error("Delete book error:", err);
      setError(err.message || "Failed to delete book.");
    } finally {
      setDeleteLoading("");
    }
  };

  // =========================
  // SEARCH + FILTER + SORT
  // =========================
  const filteredBooks = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    const result = books.filter((book) => {
      if (searchText) {
        const searchableText = [
          book.title,
          book.author,
          book.description,
          book.category,
          book.isbn,
          book.publisher,
          book.language,
          book.price,
          book.discountPrice,
          book.stock,
          book.pages,
          book.averageRating,
          book.totalReviews,
          book.featured,
          book.bestSeller,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");

        if (!searchableText.includes(searchText)) return false;
      }

      if (
        categoryFilter !== "All" &&
        book.category !== categoryFilter
      ) {
        return false;
      }

      if (
        stockFilter !== "All" &&
        getStockStatus(book.stock) !== stockFilter
      ) {
        return false;
      }

      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);

        case "priceLow":
          return Number(a.price || 0) - Number(b.price || 0);

        case "priceHigh":
          return Number(b.price || 0) - Number(a.price || 0);

        case "stockLow":
          return Number(a.stock || 0) - Number(b.stock || 0);

        case "stockHigh":
          return Number(b.stock || 0) - Number(a.stock || 0);

        case "title":
          return (a.title || "").localeCompare(b.title || "");

        case "newest":
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [books, search, categoryFilter, stockFilter, sortBy]);

  // =========================
  // DATE GROUPS
  // Group after the selected sort order.
  // Pagination happens after grouping.
  // =========================
  const groupedBooks = useMemo(() => {
    const groups = new Map();

    filteredBooks.forEach((book) => {
      const dateKey = getBookDateKey(book);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey).push(book);
    });

    const dateKeys = [...groups.keys()].sort((a, b) => {
      if (a === "unknown" && b !== "unknown") return 1;
      if (b === "unknown" && a !== "unknown") return -1;

      return b.localeCompare(a);
    });

    return dateKeys.map((dateKey) => ({
      dateKey,
      title: getDateGroupTitle(dateKey),
      items: groups.get(dateKey),
    }));
  }, [filteredBooks]);

  // =========================
  // STATISTICS
  // =========================
  const totalBooks = books.length;

  const lowStockBooks = books.filter((book) => {
    const stock = Number(book.stock || 0);
    return stock > 0 && stock <= LOW_STOCK_LIMIT;
  }).length;

  const outOfStockBooks = books.filter(
    (book) => Number(book.stock || 0) <= 0
  ).length;

  const inStockBooks = books.filter(
    (book) => Number(book.stock || 0) > LOW_STOCK_LIMIT
  ).length;

  // =========================
  // PAGINATION BY DATE GROUP
  // Each date group stays together.
  // =========================
  const totalPages = Math.ceil(groupedBooks.length / BOOKS_PER_PAGE);

  const safePage = Math.min(page, Math.max(totalPages, 1));

  const paginatedGroups = groupedBooks.slice(
    (safePage - 1) * BOOKS_PER_PAGE,
    safePage * BOOKS_PER_PAGE
  );

  const paginatedBooks = paginatedGroups.flatMap(
    (group) => group.items
  );

  // =========================
  // SELECT BOOK
  // =========================
  const handleSelectBook = (bookId) => {
    setSelectedBooks((current) =>
      current.includes(bookId)
        ? current.filter((id) => id !== bookId)
        : [...current, bookId]
    );
  };

  // =========================
  // SELECT ALL VISIBLE BOOKS
  // =========================
  const allVisibleSelected =
    paginatedBooks.length > 0 &&
    paginatedBooks.every((book) =>
      selectedBooks.includes(book._id)
    );

  const handleSelectAll = (event) => {
    const visibleIds = paginatedBooks.map((book) => book._id);

    if (event.target.checked) {
      setSelectedBooks((current) => [
        ...new Set([...current, ...visibleIds]),
      ]);
    } else {
      setSelectedBooks((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    }
  };

  // =========================
  // BULK DELETE
  // =========================
  const handleBulkDelete = async () => {
    if (selectedBooks.length === 0 || bulkDeleteLoading) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedBooks.length} selected book(s)?`
    );

    if (!confirmDelete) return;

    try {
      setBulkDeleteLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const failedDeletes = [];

      for (const bookId of selectedBooks) {
        const response = await fetch(`${API_URL}/api/books/${bookId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let data = {};

          try {
            data = await response.json();
          } catch {
            // Keep the generic error if the server returns non-JSON.
          }

          failedDeletes.push({
            id: bookId,
            message: data.message || `Failed to delete book ${bookId}`,
          });
        }
      }

      const failedIds = failedDeletes.map((item) => item.id);
      const deletedIds = selectedBooks.filter(
        (id) => !failedIds.includes(id)
      );

      setBooks((current) =>
        current.filter((book) => !deletedIds.includes(book._id))
      );

      setSelectedBooks(failedIds);

      if (failedDeletes.length > 0) {
        setError(
          `${deletedIds.length} book(s) deleted. ${failedDeletes.length} book(s) could not be deleted.`
        );
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError(err.message || "Failed to delete selected books.");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // =========================
  // EXPORT CSV
  // =========================
  const handleExportCSV = () => {
    if (filteredBooks.length === 0) return;

    const headers = [
      "Title",
      "Author",
      "Category",
      "ISBN",
      "Price",
      "Discount Price",
      "Stock",
      "Status",
      "Publisher",
      "Language",
      "Pages",
      "Featured",
      "Best Seller",
      "Created At",
    ];

    const rows = filteredBooks.map((book) => [
      book.title || "",
      book.author || "",
      book.category || "",
      book.isbn || "",
      book.price || 0,
      book.discountPrice || 0,
      book.stock || 0,
      getStockStatus(book.stock),
      book.publisher || "",
      book.language || "",
      book.pages || 0,
      book.featured ? "Yes" : "No",
      book.bestSeller ? "Yes" : "No",
      book.createdAt || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "books-report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================
  // RESET FILTERS
  // =========================
  const handleReset = () => {
    setSearch("");
    setCategoryFilter("All");
    setStockFilter("All");
    setSortBy("newest");
    setPage(1);
    setSelectedBooks([]);
  };

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, stockFilter, sortBy]);

  useEffect(() => {
    if (totalPages === 0) {
      setPage(1);
    } else if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* HEADER */}
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
          <Typography variant="h4" fontWeight="bold">
            Manage Books 📚
          </Typography>

          <Typography color="text.secondary">
            Add, edit and manage books in your store.
          </Typography>
        </Box>

        <StackActions
          refreshing={refreshing}
          onRefresh={() => fetchBooks(true)}
          onAdd={() => navigate("/admin/books/add")}
        />
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* STATISTICS */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >
        <Card elevation={3}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Total Books
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
              {totalBooks}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={3}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              In Stock
            </Typography>
            <Typography
              variant="h4"
              fontWeight="bold"
              color="success.main"
              sx={{ mt: 1 }}
            >
              {inStockBooks}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={3}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Low Stock
            </Typography>
            <Typography
              variant="h4"
              fontWeight="bold"
              color="warning.main"
              sx={{ mt: 1 }}
            >
              {lowStockBooks}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ≤ {LOW_STOCK_LIMIT} items
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={3}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Out of Stock
            </Typography>
            <Typography
              variant="h4"
              fontWeight="bold"
              color="error.main"
              sx={{ mt: 1 }}
            >
              {outOfStockBooks}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* SEARCH */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 3,
          width: "100%",
        }}
      >
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search books..."
          size="medium"
          sx={{ width: { xs: "100%", sm: "500px", md: "600px" } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* FILTERS */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <MenuItem value="All">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Stock</InputLabel>
            <Select
              value={stockFilter}
              label="Stock"
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <MenuItem value="All">All Stock</MenuItem>
              <MenuItem value="In Stock">In Stock</MenuItem>
              <MenuItem value="Low Stock">Low Stock</MenuItem>
              <MenuItem value="Out of Stock">Out of Stock</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(event) => setSortBy(event.target.value)}
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="priceLow">Price: Low → High</MenuItem>
              <MenuItem value="priceHigh">Price: High → Low</MenuItem>
              <MenuItem value="stockLow">Stock: Low → High</MenuItem>
              <MenuItem value="stockHigh">Stock: High → Low</MenuItem>
              <MenuItem value="title">Title: A → Z</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      {/* ACTION BAR */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{filteredBooks.length}</strong> of{" "}
          <strong>{totalBooks}</strong> books
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={selectedBooks.length === 0 || bulkDeleteLoading}
            onClick={handleBulkDelete}
          >
            {bulkDeleteLoading
              ? "Deleting..."
              : `Delete Selected${
                  selectedBooks.length > 0
                    ? ` (${selectedBooks.length})`
                    : ""
                }`}
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={filteredBooks.length === 0}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* BOOK TABLE */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={
                    selectedBooks.some((id) =>
                      paginatedBooks.some((book) => book._id === id)
                    ) && !allVisibleSelected
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>

              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Author</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>ISBN</strong></TableCell>
              <TableCell><strong>Price</strong></TableCell>
              <TableCell><strong>Stock</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    {search ||
                    categoryFilter !== "All" ||
                    stockFilter !== "All"
                      ? "No books match your filters."
                      : "No books found."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedGroups.map((group) => (
                <Fragment key={`date-${group.dateKey}`}>
                  <TableRow
                    sx={{
                      bgcolor: "action.hover",
                      "& td": { py: 1.5 },
                    }}
                  >
                    <TableCell colSpan={9}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Typography fontWeight={800}>
                          {group.title}
                        </Typography>

                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${group.items.length} ${
                            group.items.length === 1 ? "book" : "books"
                          }`}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>

                  {group.items.map((book) => (
                    <TableRow key={book._id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedBooks.includes(book._id)}
                          onChange={() => handleSelectBook(book._id)}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={500}>
                          {book.title}
                        </Typography>
                      </TableCell>

                      <TableCell>{book.author}</TableCell>
                      <TableCell>{book.category}</TableCell>
                      <TableCell>{book.isbn}</TableCell>

                      <TableCell>
                        ₹{Number(book.price || 0).toFixed(2)}
                      </TableCell>

                      <TableCell>
                        <Typography
                          fontWeight="bold"
                          color={
                            Number(book.stock || 0) <= 0
                              ? "error.main"
                              : Number(book.stock || 0) <= LOW_STOCK_LIMIT
                                ? "warning.main"
                                : "success.main"
                          }
                        >
                          {book.stock ?? 0}
                        </Typography>
                      </TableCell>

                      <TableCell>{getStockChip(book.stock)}</TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                          onClick={() =>
                            navigate(`/admin/books/edit/${book._id}`)
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={deleteLoading === book._id}
                          onClick={() => handleDelete(book._id)}
                        >
                          {deleteLoading === book._id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={safePage}
            onChange={(_, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {filteredBooks.length > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 2 }}
        >
          Showing {paginatedBooks.length} books on this page, from{" "}
          {filteredBooks.length} filtered books
        </Typography>
      )}
    </Box>
  );
}

function StackActions({ refreshing, onRefresh, onAdd }) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Button
        variant="outlined"
        startIcon={
          refreshing ? <CircularProgress size={17} /> : <RefreshIcon />
        }
        onClick={onRefresh}
        disabled={refreshing}
      >
        Refresh
      </Button>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAdd}
      >
        Add Book
      </Button>
    </Box>
  );
}

export default AdminBooks;
