import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../store/slices/cartSlice";
import { toast } from "react-toastify";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Rating,
  Typography,
  Button,
} from "@mui/material";

import {
  FavoriteBorder,
  ShoppingCartOutlined,
} from "@mui/icons-material";



function BookCard({ book }) {
  const dispatch = useDispatch();

// const handleAddToCart = async (e) => {
//   e.preventDefault(); // Prevents link/card navigation if nested
//   e.stopPropagation();

//   // 1. Verify book ID exists
//   const bookId = book?._id || book?.id;
//   if (!bookId) {
//     toast.error("Invalid book ID");
//     return;
//   }

//   try {
//     // 2. Dispatch action
//     const res = await dispatch(
//       addToCart({
//         bookId: bookId,
//         quantity: 1,
//       })
//     );

//     // If using createAsyncThunk without unwrap:
//     if (addToCart.rejected.match(res)) {
//       const errorMsg =
//         res.payload?.message || res.error?.message || "Failed to add to cart";
//       toast.error(errorMsg);
//       return;
//     }

//     toast.success(`${book.title || "Book"} added to cart`);
//   } catch (err) {
//     console.error("ADD TO CART ERROR:", err);
//     // Safe string formatting for Toastify
//     const message =
//       typeof err === "string"
//         ? err
//         : err?.message || "Failed to add book to cart";
//     toast.error(message);
//   }
// };

// const handleAddToCart = (e) => {
//   e.preventDefault();
//   e.stopPropagation();

//   const bookId = book?._id || book?.id;
//   if (!bookId) {
//     toast.error("Invalid book ID");
//     return;
//   }

//   try {
//     dispatch(
//       addToCart({
//         _id: bookId,
//         title: book.title,
//         price: book.discountPrice || book.price,
//         image: book.image,
//         quantity: 1,
//       })
//     );

//     toast.success(`${book.title} added to cart`);
//   } catch (err) {
//     console.error("ADD TO CART ERROR:", err);
//     toast.error("Failed to add book to cart");
//   }
// };

const handleAddToCart = async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const bookId = book?._id || book?.id;
  if (!bookId) {
    toast.error("Invalid book ID");
    return;
  }

  const resultAction = await dispatch(addToCart({ bookId, quantity: 1 }));

  if (addToCart.fulfilled.match(resultAction)) {
    toast.success(`${book.title} added to cart`);
  } else {
    toast.error(resultAction.payload || "Failed to add book to cart");
  }
};


  const discount =
    book.price && book.discountPrice
      ? Math.round(
          ((book.price - book.discountPrice) / book.price) * 100
        )
      : 0;

  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 3,
        boxShadow: "none",
        overflow: "hidden",
        transition: "all 0.25s ease",
        position: "relative",

        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 15px 35px rgba(15,23,42,0.10)",
        },
      }}
    >
      {/* Discount */}
      {discount > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            px: 1.2,
            py: 0.5,
            borderRadius: 1.5,
            backgroundColor: "#111827",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {discount}% OFF
        </Box>
      )}

      {/* Wishlist */}
      <IconButton
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          backgroundColor: "#fff",
          boxShadow: "0 3px 10px rgba(0,0,0,0.08)",

          "&:hover": {
            backgroundColor: "#f8fafc",
          },
        }}
      >
        <FavoriteBorder fontSize="small" />
      </IconButton>

      {/* Image */}
      <Box
  component={Link}
  to={`/books/${book._id}`}
  sx={{
    height: 280,
    backgroundColor: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 2,
    textDecoration: "none",
  }}
>
  <CardMedia
    component="img"
    image={
      book.image?.url ||
      "https://via.placeholder.com/300x400?text=Book"
    }
    alt={book.title}
    sx={{
      height: "100%",
      width: "100%",
      objectFit: "contain",
      transition: "transform 0.3s ease",

      "&:hover": {
        transform: "scale(1.04)",
      },
    }}
  />
</Box>

      <CardContent sx={{ p: 2.5 }}>
        {/* Category */}
        <Typography
          sx={{
            fontSize: 12,
            color: "#64748b",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {book.category || "Book"}
        </Typography>

        {/* Title */}
        <Typography
  component={Link}
  to={`/books/${book._id}`}
  sx={{
    mt: 0.7,
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    textDecoration: "none",
    lineHeight: 1.3,

    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",

    "&:hover": {
      color: "#475569",
    },
  }}
>
  {book.title}
</Typography>
        {/* Author */}
        <Typography
          sx={{
            mt: 0.6,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          by {book.author}
        </Typography>

        {/* Rating */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1.2,
          }}
        >
          <Rating
            value={book.averageRating || 0}
            precision={0.5}
            size="small"
            readOnly
          />

          <Typography
            sx={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            ({book.totalReviews || 0})
          </Typography>
        </Box>

        {/* Price */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1.5,
          }}
        >
          <Typography
            sx={{
              fontSize: 21,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            ₹{book.discountPrice || book.price}
          </Typography>

          {book.discountPrice && (
            <Typography
              sx={{
                fontSize: 14,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              ₹{book.price}
            </Typography>
          )}
        </Box>

        {/* Add Cart */}
        <Button
          fullWidth
          variant="contained"
          startIcon={<ShoppingCartOutlined />}
          onClick={handleAddToCart}
          sx={{
            mt: 2,
            py: 1.2,
            borderRadius: 2,
            backgroundColor: "#111827",
            textTransform: "none",
            fontWeight: 700,

            "&:hover": {
              backgroundColor: "#000",
            },
          }}
        >
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

export default BookCard;