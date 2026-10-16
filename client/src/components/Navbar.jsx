import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";

import {
  ShoppingCartOutlined,
  PersonOutlineOutlined,
  FavoriteBorder,
  Search,
  NotificationsNone,
} from "@mui/icons-material";

import { Link, useLocation, useNavigate } from "react-router-dom";

// Shared style for the top navigation buttons
const navBtnSx = (active) => ({
  color: active ? "#2563eb" : "#374151",
  fontWeight: active ? 800 : 600,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  borderBottom: active
    ? "2px solid #2563eb"
    : "2px solid transparent",
  borderRadius: 0,
  pb: 1,
  "&:hover": {
    color: "#2563eb",
    backgroundColor: "transparent",
  },
});

// Shared style for navigation action items
const actionItemSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: { xs: 46, md: 80 },
};

// Shared style for action labels
const actionLabelSx = {
  display: { xs: "none", md: "block" },
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
};

// Shared style for count badges
const badgeSx = {
  "& .MuiBadge-badge": {
    fontWeight: 700,
    fontSize: 10,
    minWidth: 17,
    height: 17,
  },
};

function Navbar() {
  const [search, setSearch] = useState("");
  const [wishlistCount, setWishlistCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  // REDUX DATA
  const user = useSelector((state) => state.auth.user);
  const cartItems = useSelector((state) => state.cart.items);

  // CART COUNT
  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  // ACTIVE LINKS
  const params = new URLSearchParams(location.search);
  const onBooks = location.pathname === "/books";

  const isHome = location.pathname === "/";
  const isBestSellers =
    onBooks && params.get("sort") === "bestselling";
  const isBooks = onBooks && !isBestSellers;

  // KEEP SEARCH BOX IN SYNC WITH URL
  useEffect(() => {
    setSearch(onBooks ? params.get("search") || "" : "");
  }, [location.pathname, location.search]);

  // LOAD WISHLIST COUNT
  useEffect(() => {
    let cancelled = false;

    const fetchWishlistCount = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setWishlistCount(0);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/wishlist`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (!cancelled) setWishlistCount(0);
          return;
        }

        const data = await response.json();

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

        if (!cancelled) {
          setWishlistCount(items.length);
        }
      } catch (error) {
        console.error("NAVBAR WISHLIST ERROR:", error);

        if (!cancelled) {
          setWishlistCount(0);
        }
      }
    };

    fetchWishlistCount();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // LOAD UNREAD NOTIFICATION COUNT
  useEffect(() => {
    let cancelled = false;

    const fetchUnreadNotificationCount = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setUnreadNotificationCount(0);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/notifications/unread-count`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setUnreadNotificationCount(0);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUnreadNotificationCount(
            Number(data.unreadCount || 0)
          );
        }
      } catch (error) {
        console.error("NAVBAR NOTIFICATION ERROR:", error);

        if (!cancelled) {
          setUnreadNotificationCount(0);
        }
      }
    };

    fetchUnreadNotificationCount();

    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  // SEARCH
  const handleSearch = (e) => {
    e.preventDefault();

    const value = search.trim();

    navigate(
      value
        ? `/books?search=${encodeURIComponent(value)}`
        : "/books"
    );
  };

  return (
    <>
      {/* TOP BLACK STRIP */}
      <Box
        sx={{
          height: 8,
          width: "100%",
          backgroundColor: "#000000",
          flexShrink: 0,
        }}
      />

      {/* MAIN NAVBAR */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "#fff",
          color: "#111827",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 1100,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 72, md: 96 },
            px: { xs: 2, md: 3 },
            gap: { xs: 2, md: 4 },
          }}
        >
          {/* LOGO */}
          <Typography
            component={Link}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              color: "#111827",
              fontSize: { xs: 22, md: 30 },
              fontWeight: 900,
              letterSpacing: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: { xs: 26, md: 34 },
                lineHeight: 1,
              }}
            >
              📚
            </Box>
            BookStore
          </Typography>

          {/* DESKTOP SEARCH */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              flex: 1,
              maxWidth: 610,
              display: { xs: "none", md: "block" },
              mx: "auto",
            }}
          >
            <TextField
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, ISBN or category..."
              size="small"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        type="submit"
                        sx={{
                          minWidth: 48,
                          width: 48,
                          height: 45,
                          borderRadius: 2,
                          backgroundColor: "#0b1120",
                          color: "#fff",
                          p: 0,
                          "&:hover": {
                            backgroundColor: "#172554",
                          },
                        }}
                      >
                        <Search />
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  height: 58,
                  borderRadius: 3,
                  backgroundColor: "#fff",
                  "& fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&:hover fieldset": {
                    borderColor: "#9ca3af",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#2563eb",
                    borderWidth: 1,
                  },
                },
              }}
            />
          </Box>

          {/* NAVIGATION LINKS */}
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 3,
            }}
          >
            <Button
              component={Link}
              to="/"
              sx={navBtnSx(isHome)}
            >
              Home
            </Button>

            <Button
              component={Link}
              to="/books"
              sx={navBtnSx(isBooks)}
            >
              Books
            </Button>

            <Button
              component={Link}
              to="/books?sort=bestselling"
              sx={navBtnSx(isBestSellers)}
            >
              Best Sellers
            </Button>

            {user?.role === "admin" && (
              <Button
                component={Link}
                to="/admin"
                sx={{
                  color: "#dc2626",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  borderBottom: "2px solid transparent",
                  borderRadius: 0,
                  pb: 1,
                  "&:hover": {
                    color: "#b91c1c",
                    backgroundColor: "transparent",
                  },
                }}
              >
                Admin
              </Button>
            )}
          </Box>

          {/* NOTIFICATIONS, WISHLIST, CART AND ACCOUNT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              ml: { xs: "auto", lg: 1 },
            }}
          >
            {/* NOTIFICATIONS */}
            <Box sx={actionItemSx}>
              <IconButton
                component={Link}
                to="/notifications"
                aria-label="Notifications"
                sx={{
                  width: 42,
                  height: 42,
                  color: "#2563eb",
                  "&:hover": {
                    backgroundColor: "#eff6ff",
                  },
                }}
              >
                <Badge
                  badgeContent={unreadNotificationCount}
                  color="error"
                  invisible={unreadNotificationCount === 0}
                  sx={badgeSx}
                >
                  <NotificationsNone fontSize="medium" />
                </Badge>
              </IconButton>

              <Typography sx={actionLabelSx}>
                ALERTS
              </Typography>
            </Box>

            {/* WISHLIST */}
            <Box sx={actionItemSx}>
              <IconButton
                component={Link}
                to="/wishlist"
                aria-label="Wishlist"
                sx={{
                  width: 42,
                  height: 42,
                  color: "#e11d48",
                  "&:hover": {
                    backgroundColor: "#fff1f2",
                  },
                }}
              >
                <Badge
                  badgeContent={wishlistCount}
                  color="error"
                  invisible={wishlistCount === 0}
                  sx={badgeSx}
                >
                  <FavoriteBorder fontSize="medium" />
                </Badge>
              </IconButton>

              <Typography sx={actionLabelSx}>
                WISHLIST
              </Typography>
            </Box>

            {/* CART */}
            <Box sx={actionItemSx}>
              <IconButton
                component={Link}
                to="/cart"
                aria-label="Shopping cart"
                sx={{
                  width: 42,
                  height: 42,
                  color: "#111827",
                  "&:hover": {
                    backgroundColor: "#f1f5f9",
                  },
                }}
              >
                <Badge
                  badgeContent={cartCount}
                  color="primary"
                  invisible={cartCount === 0}
                  sx={badgeSx}
                >
                  <ShoppingCartOutlined fontSize="medium" />
                </Badge>
              </IconButton>

              <Typography sx={actionLabelSx}>
                CART
              </Typography>
            </Box>

            {/* ACCOUNT */}
            <Box
              sx={{
                ...actionItemSx,
                ml: 1,
                borderLeft: "1px solid #e5e7eb",
              }}
            >
              <IconButton
                component={Link}
                to={user ? "/account" : "/login"}
                aria-label="Account"
                state={
                  user
                    ? undefined
                    : {
                        from:
                          location.pathname + location.search,
                      }
                }
                sx={{
                  width: 42,
                  height: 42,
                  color: "#111827",
                  "&:hover": {
                    backgroundColor: "#f1f5f9",
                  },
                }}
              >
                <PersonOutlineOutlined fontSize="medium" />
              </IconButton>

              <Typography sx={actionLabelSx}>
                ACCOUNT
              </Typography>
            </Box>
          </Box>
        </Toolbar>

        {/* MOBILE SEARCH */}
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            display: { xs: "block", md: "none" },
            px: 2,
            pb: 2,
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="submit"
                      size="small"
                      aria-label="Search books"
                      sx={{
                        color: "#111827",
                      }}
                    >
                      <Search />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 48,
                borderRadius: 2,
                backgroundColor: "#fff",
                "& fieldset": {
                  borderColor: "#d1d5db",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#2563eb",
                },
              },
            }}
          />
        </Box>
      </AppBar>
    </>
  );
}

export default Navbar;
