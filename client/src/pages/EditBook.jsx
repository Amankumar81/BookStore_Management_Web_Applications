import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = "https://bookstore-management-web-applications.onrender.com";

function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    category: "",
    price: "",
    discountPrice: "",
    stock: "",
    isbn: "",
    publisher: "",
    language: "English",
    pages: "",
    featured: false,
    bestSeller: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // FETCH BOOK
  // =========================
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setError("");

        const response = await fetch(`${API_URL}/api/books/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch book");
        }

        const book = data.book;

        setForm({
          title: book.title || "",
          author: book.author || "",
          description: book.description || "",
          category: book.category || "",
          price: book.price ?? "",
          discountPrice: book.discountPrice ?? "",
          stock: book.stock ?? "",
          isbn: book.isbn || "",
          publisher: book.publisher || "",
          language: book.language || "English",
          pages: book.pages ?? "",
          featured: book.featured || false,
          bestSeller: book.bestSeller || false,
        });
      } catch (err) {
        console.error("Fetch book error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  // =========================
  // HANDLE INPUT
  // =========================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // =========================
  // UPDATE BOOK
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("You are not logged in. Please login again.");
      }

      const bookData = {
        title: form.title.trim(),
        author: form.author.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number(form.price),
        discountPrice: Number(form.discountPrice || 0),
        stock: Number(form.stock),
        isbn: form.isbn.trim(),
        publisher: form.publisher.trim(),
        language: form.language.trim(),
        pages: Number(form.pages),
        featured: form.featured,
        bestSeller: form.bestSeller,
      };

      console.log("📤 Updating book:", bookData);

      const response = await fetch(`${API_URL}/api/books/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookData),
      });

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = {
          message:
            responseText || "Server returned an empty response.",
        };
      }

      console.log("📥 Update response:", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to update book. Server returned ${response.status}`
        );
      }

      setSuccess(
        data.message || "Book updated successfully! 📚"
      );

      setTimeout(() => {
        navigate("/admin/books");
      }, 1000);
    } catch (err) {
      console.error("❌ Edit book error:", err);
      setError(err.message || "Failed to update book.");
    } finally {
      setSaving(false);
    }
  };

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

  // =========================
  // PAGE
  // =========================
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        p: { xs: 2, md: 3 },
        boxSizing: "border-box",
      }}
    >
      {/* PAGE TITLE */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 1 }}
      >
        Edit Book ✏️
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Update the details of this book.
      </Typography>

      {/* ERROR */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* SUCCESS */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* FORM CARD */}
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          p: { xs: 2, md: 4 },
          boxSizing: "border-box",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <Grid container spacing={3}>

            {/* ===================================== */}
            {/* ROW 1 */}
            {/* ===================================== */}

            {/* Book Title */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                label="Book Title"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
            </Grid>

            {/* Author */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                label="Author"
                name="author"
                value={form.author}
                onChange={handleChange}
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                select
                label="Category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <MenuItem value="Programming">
                  Programming
                </MenuItem>

                <MenuItem value="Novel">
                  Novel
                </MenuItem>

                <MenuItem value="Science">
                  Science
                </MenuItem>

                <MenuItem value="History">
                  History
                </MenuItem>

                <MenuItem value="Biography">
                  Biography
                </MenuItem>

                <MenuItem value="Business">
                  Business
                </MenuItem>

                <MenuItem value="Technology">
                  Technology
                </MenuItem>

                <MenuItem value="Other">
                  Other
                </MenuItem>
              </TextField>
            </Grid>

            {/* Price */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Price"
                name="price"
                value={form.price}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* ===================================== */}
            {/* ROW 2 */}
            {/* ===================================== */}

            {/* Discount Price */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                type="number"
                label="Discount Price"
                name="discountPrice"
                value={form.discountPrice}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Stock */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Stock"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* ISBN */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                label="ISBN"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
              />
            </Grid>

            {/* ===================================== */}
            {/* ROW 3 */}
            {/* ===================================== */}

            {/* Publisher */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                label="Publisher"
                name="publisher"
                value={form.publisher}
                onChange={handleChange}
              />
            </Grid>

            {/* Language */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                label="Language"
                name="language"
                value={form.language}
                onChange={handleChange}
              />
            </Grid>

            {/* Number of Pages */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Number of Pages"
                name="pages"
                value={form.pages}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* ===================================== */}
            {/* ROW 4 - DESCRIPTION + FEATURED + BEST */}
            {/* ===================================== */}

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  width: "100%",
                  flexWrap: "wrap",
                }}
              >
                {/* Description */}
                <Box
                  sx={{
                    width: {
                      xs: "100%",
                      md: "45%",
                    },
                  }}
                >
                  <TextField
                    fullWidth
                    required
                    multiline
                    rows={8}
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                  />
                </Box>

                {/* Featured */}
                <Box
                  sx={{
                    width: {
                      xs: "100%",
                      sm: "180px",
                      md: "180px",
                    },
                  }}
                >
                  <TextField
                    fullWidth
                    select
                    label="Featured"
                    name="featured"
                    value={form.featured}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        featured:
                          e.target.value === "true",
                      })
                    }
                  >
                    <MenuItem value="false">
                      No
                    </MenuItem>

                    <MenuItem value="true">
                      Yes
                    </MenuItem>
                  </TextField>
                </Box>

                {/* Best Seller */}
                <Box
                  sx={{
                    width: {
                      xs: "100%",
                      sm: "180px",
                      md: "180px",
                    },
                  }}
                >
                  <TextField
                    fullWidth
                    select
                    label="Best Seller"
                    name="bestSeller"
                    value={form.bestSeller}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bestSeller:
                          e.target.value === "true",
                      })
                    }
                  >
                    <MenuItem value="false">
                      No
                    </MenuItem>

                    <MenuItem value="true">
                      Yes
                    </MenuItem>
                  </TextField>
                </Box>

                {/* Update Button */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mt: 1,
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={saving}
                    sx={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {saving
                      ? "Updating..."
                      : "Update Book"}
                  </Button>
                </Box>

                {/* Cancel Button */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mt: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() =>
                      navigate("/admin/books")
                    }
                    disabled={saving}
                    sx={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Grid>

          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}

export default EditBook;

