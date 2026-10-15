import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

function AddBook() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    category: "",
    price: "",
    stock: "",
    isbn: "",
    publisher: "",
    language: "English",
    pages: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

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
        stock: Number(form.stock),
        isbn: form.isbn.trim(),
        publisher: form.publisher.trim(),
        language: form.language.trim(),
        pages: Number(form.pages),
      };

      console.log("📤 Sending book data:", bookData);

      const response = await fetch(`${API_URL}/api/books`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookData),
      });

      const responseText = await response.text();

      console.log("📡 Response status:", response.status);
      console.log("📥 Backend response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = {
          message: responseText || "Server returned an empty response.",
        };
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to add book. Server returned ${response.status}`
        );
      }

      setSuccess(data.message || "Book added successfully! 📚");

      setForm({
        title: "",
        author: "",
        description: "",
        category: "",
        price: "",
        stock: "",
        isbn: "",
        publisher: "",
        language: "English",
        pages: "",
      });

      setTimeout(() => {
        navigate("/admin/books");
      }, 1000);
    } catch (err) {
      console.error("❌ Add book error:", err);
      setError(err.message || "Failed to add book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Add New Book 📚
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Add a new book to your BookStore inventory.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, md: 4 },
          maxWidth: 1000,
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>

            {/* Title */}
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Author"
                name="author"
                value={form.author}
                onChange={handleChange}
              />
            </Grid>
            {/* category */}
           <Grid item xs={12} md={6}>
             <TextField
               fullWidth
               required
               select
               label="Category"
               name="category"
               value={form.category}
               onChange={handleChange}
               sx={{
                 minWidth: 300,
               }}
             >
               <MenuItem value="Programming">Programming</MenuItem>
               <MenuItem value="Novel">Novel</MenuItem>
               <MenuItem value="Science">Science</MenuItem>
               <MenuItem value="History">History</MenuItem>
               <MenuItem value="Biography">Biography</MenuItem>
               <MenuItem value="Business">Business</MenuItem>
               <MenuItem value="Technology">Technology</MenuItem>
               <MenuItem value="Other">Other</MenuItem>
             </TextField>
           </Grid>

            {/* Price */}
            <Grid item xs={12} md={6}>
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

            {/* Stock */}
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="ISBN"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
              />
            </Grid>

            {/* Publisher */}
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Language"
                name="language"
                value={form.language}
                onChange={handleChange}
              />
            </Grid>

            {/* Pages */}
            <Grid item xs={12} md={6}>
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

            {/* Published Year */}
            {/* Removed because your backend Joi schema does not contain
                publishedYear. */}

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={5}
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </Grid>

            {/* Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? "Adding..." : "Add Book"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/admin/books")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>

          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}

export default AddBook;