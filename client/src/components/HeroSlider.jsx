import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Typography,
  IconButton,
} from "@mui/material";

import {
  ArrowBackIosNew,
  ArrowForwardIos,
  ShoppingBagOutlined,
  LocalOfferOutlined,
} from "@mui/icons-material";

import { Link } from "react-router-dom";

const slides = [
  {
    label: "NEW COLLECTION",
    title: (
      <>
        Build your future,
        <br />
        <span>one book</span> at a time.
      </>
    ),
    description:
      "Explore thousands of books across every genre. Learn, grow and achieve your goals with the best books.",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=85",
    offer: "40%",
  },

  {
    label: "BESTSELLERS",
    title: (
      <>
        Stories you'll
        <br />
        <span>never forget.</span>
      </>
    ),
    description:
      "Discover bestselling fiction, inspiring stories and reader favourites selected for you.",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=85",
    offer: "30%",
  },

  {
    label: "TECH COLLECTION",
    title: (
      <>
        Upgrade your
        <br />
        <span>knowledge.</span>
      </>
    ),
    description:
      "Master programming, technology, business and data science with books from leading authors.",
    image:
      "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=85",
    offer: "25%",
  },
];

function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const slide = slides[active];

  const next = () => {
    setActive((prev) => (prev + 1) % slides.length);
  };

  const previous = () => {
    setActive((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        background:
          "linear-gradient(110deg, #061124 0%, #0b1428 45%, #101d3a 100%)",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          right: -250,
          top: -350,
          background: "rgba(37,99,235,.15)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          left: -180,
          bottom: -200,
          background: "rgba(37,99,235,.08)",
        }}
      />

      <Container
        maxWidth={false}
        sx={{
          position: "relative",
          px: {
            xs: 3,
            sm: 5,
            md: 8,
            lg: 12,
          },
        }}
      >
        <Box
          sx={{
            minHeight: {
              xs: 590,
              md: 620,
            },

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
            },

            alignItems: "center",

            gap: {
              xs: 2,
              md: 5,
            },
          }}
        >
          {/* LEFT */}
          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              py: 7,
            }}
          >
            {/* Label */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 10,
                background: "#1d4ed8",
                mb: 3,
              }}
            >
              <LocalOfferOutlined sx={{ fontSize: 17 }} />

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
                {slide.label}
              </Typography>
            </Box>

            {/* Heading */}
            <Typography
              sx={{
                fontSize: {
                  xs: 44,
                  sm: 55,
                  md: 60,
                  lg: 70,
                },

                fontWeight: 900,

                lineHeight: 1.03,

                letterSpacing: "-2px",

                maxWidth: 700,

                mb: 3,

                "& span": {
                  color: "#3b82f6",
                },
              }}
            >
              {slide.title}
            </Typography>

            <Typography
              sx={{
                color: "#cbd5e1",
                fontSize: {
                  xs: 16,
                  md: 18,
                },
                lineHeight: 1.8,
                maxWidth: 600,
                mb: 4,
              }}
            >
              {slide.description}
            </Typography>

            {/* Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Button
                component={Link}
                to="/books"
                variant="contained"
                size="large"
                startIcon={<ShoppingBagOutlined />}
                sx={{
                  px: 3.5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  background: "#2563eb",
                  "&:hover": {
                    background: "#1d4ed8",
                  },
                }}
              >
                Explore Books
              </Button>

              <Button
                component={Link}
                to="/books"
                variant="outlined"
                size="large"
                sx={{
                  px: 3.5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "#fff",
                  borderColor: "#64748b",
                  "&:hover": {
                    borderColor: "#fff",
                    background: "rgba(255,255,255,.05)",
                  },
                }}
              >
                View Deals
              </Button>
            </Box>

            {/* Dots */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                mt: 6,
              }}
            >
              {slides.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setActive(index)}
                  sx={{
                    width: active === index ? 35 : 10,
                    height: 6,
                    borderRadius: 10,
                    background:
                      active === index
                        ? "#2563eb"
                        : "#94a3b8",
                    cursor: "pointer",
                    transition: "all .3s",
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* RIGHT BOOK */}
          <Box
            sx={{
              height: "100%",
              minHeight: 520,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Glow */}
            <Box
              sx={{
                position: "absolute",
                width: 420,
                height: 420,
                borderRadius: "50%",
                background: "rgba(37,99,235,.2)",
                filter: "blur(50px)",
              }}
            />

            {/* Main book */}
            <Box
              component="img"
              src={slide.image}
              alt="Book"
              sx={{
                position: "relative",
                zIndex: 2,

                width: {
                  xs: 230,
                  sm: 280,
                  md: 330,
                  lg: 370,
                },

                height: {
                  xs: 330,
                  sm: 400,
                  md: 470,
                },

                objectFit: "cover",

                borderRadius: "8px",

                transform: "rotate(-5deg)",

                boxShadow:
                  "25px 35px 60px rgba(0,0,0,.55)",

                transition: "all .5s ease",
              }}
            />

            {/* Offer */}
            <Box
              sx={{
                position: "absolute",
                zIndex: 5,
                right: {
                  xs: "4%",
                  md: "5%",
                },
                top: "18%",

                width: 125,
                height: 125,

                borderRadius: "50%",

                border: "2px solid #3b82f6",

                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",

                background: "#0b1120",

                boxShadow:
                  "0 0 35px rgba(37,99,235,.4)",
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                UP TO
              </Typography>

              <Typography
                sx={{
                  fontSize: 34,
                  lineHeight: 1,
                  fontWeight: 900,
                  color: "#facc15",
                }}
              >
                {slide.offer}
              </Typography>

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                OFF
              </Typography>
            </Box>

            {/* Arrows */}
            <Box
              sx={{
                position: "absolute",
                left: -20,
                right: -20,
                display: "flex",
                justifyContent: "space-between",
                zIndex: 10,
              }}
            >
              <IconButton
                onClick={previous}
                sx={{
                  background: "rgba(255,255,255,.08)",
                  color: "#fff",
                  "&:hover": {
                    background: "#2563eb",
                  },
                }}
              >
                <ArrowBackIosNew fontSize="small" />
              </IconButton>

              <IconButton
                onClick={next}
                sx={{
                  background: "rgba(255,255,255,.08)",
                  color: "#fff",
                  "&:hover": {
                    background: "#2563eb",
                  },
                }}
              >
                <ArrowForwardIos fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default HeroSlider;