import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import BookCard from "./BookCard";

const BookSection = ({ title, books = [] }) => {
  return (
    <Box
      sx={{
        maxWidth: "1400px",
        mx: "auto",
        px: {
          xs: 2,
          md: 5,
        },
        py: 7,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: "28px",
                md: "36px",
              },
              fontWeight: 800,
            }}
          >
            {title}
          </Typography>

          <Typography color="text.secondary">
            Discover books you'll love
          </Typography>
        </Box>

        <Button
          component={Link}
          to="/books"
          sx={{
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          View All →
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {books.map((book) => (
          <BookCard
            key={book._id}
            book={book}
          />
        ))}
      </Box>
    </Box>
  );
};

export default BookSection;