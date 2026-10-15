import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  PersonOutlineOutlined,
  Inventory2Outlined,
  FavoriteBorder,
  LocationOnOutlined,
  CreditCardOutlined,
  LocalOfferOutlined,
  NotificationsNone,
  SupportAgent,
  LockOutlined,
  ChevronRight,
  Logout,
  AdminPanelSettingsOutlined,
  LocalShippingOutlined,
  AssignmentReturnOutlined,
} from "@mui/icons-material";

const quickActions = [
  { label: "Orders", icon: <Inventory2Outlined />, to: "/orders" },
  { label: "My Returns", icon: <AssignmentReturnOutlined />, to: "/returns" },
  { label: "Wishlist", icon: <FavoriteBorder />, to: "/wishlist" },
  { label: "Track", icon: <LocalShippingOutlined />, to: "/orders" },
];

const sections = [
  {
    title: "My activity",
    items: [
      {
        label: "My orders",
        sub: "Track, return or reorder",
        icon: <Inventory2Outlined />,
        to: "/orders",
      },
      {
        label: "My Returns",
        sub: "Request returns and track refund status",
        icon: <AssignmentReturnOutlined />,
        to: "/returns",
      },
      {
        label: "Wishlist",
        sub: "Books you saved",
        icon: <FavoriteBorder />,
        to: "/wishlist",
      },
    ],
  },
  {
    title: "Profile & payments",
    items: [
      {
        label: "Personal details",
        sub: "Name, phone, email, password",
        icon: <PersonOutlineOutlined />,
        to: "/profile",
      },
      {
        label: "Saved addresses",
        sub: "Manage delivery addresses",
        icon: <LocationOnOutlined />,
        to: "/addresses",
      },
      {
        label: "Payment methods",
        sub: "Cards, UPI and wallets",
        icon: <CreditCardOutlined />,
        to: "/payments",
      },
      {
        label: "Offers & coupons",
        sub: "Discounts available for you",
        icon: <LocalOfferOutlined />,
        to: "/offers",
      },
    ],
  },
  {
    title: "Settings & support",
    items: [
      {
        label: "Notifications",
        sub: "Order and offer alerts",
        icon: <NotificationsNone />,
        to: "/notifications",
      },
      {
        label: "Help & support",
        sub: "FAQs and contact us",
        icon: <SupportAgent />,
        to: "/help",
      },
      {
        label: "Privacy & terms",
        icon: <LockOutlined />,
        to: "/privacy",
      },
    ],
  },
];

function Account() {
  const user = useSelector((state) => state.auth.user);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Dynamic Page Title
  useEffect(() => {
    document.title = user?.name ? `${user.name} - My Account` : "My Account - BookStore";
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("pendingAction");
    window.location.href = "/";
  };

  if (!user) return null;

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "80vh", py: 4 }}>
      <Container maxWidth="md">
        {/* Profile Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 3,
            mb: 3,
            color: "#fff",
            background: "linear-gradient(135deg, #0b1120 0%, #1e3a8a 100%)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2.5,
              flexWrap: "wrap",
            }}
          >
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "#2563eb",
                fontSize: 30,
                fontWeight: 800,
                border: "3px solid rgba(255,255,255,0.25)",
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography fontWeight={800} fontSize={{ xs: 20, md: 24 }}>
                {user.name}
              </Typography>
              <Typography sx={{ color: "#cbd5e1", fontSize: 14 }}>
                {user.email}
              </Typography>
              {user.phone && (
                <Typography sx={{ color: "#cbd5e1", fontSize: 14 }}>
                  {user.phone}
                </Typography>
              )}
            </Box>

            <Chip
              label={user.role === "admin" ? "Admin" : "Customer"}
              sx={{
                backgroundColor: "#facc15",
                color: "#0b1120",
                fontWeight: 700,
              }}
            />
          </Box>
        </Paper>

        {/* Quick Actions */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 3,
            border: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 1.5,
          }}
        >
          {quickActions.map((action) => (
            <Button
              key={action.label}
              component={Link}
              to={action.to}
              variant="outlined"
              startIcon={action.icon}
              sx={{
                justifyContent: "flex-start",
                py: 1.2,
                color: "#1e293b",
                borderColor: "#cbd5e1",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "#2563eb",
                  backgroundColor: "#eff6ff",
                },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Paper>

        {/* Admin Dashboard Entry */}
        {user.role === "admin" && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              mb: 3,
              bgcolor: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <AdminPanelSettingsOutlined sx={{ fontSize: 32, color: "#1d4ed8" }} />
              <Box>
                <Typography fontWeight={700} color="#1e3a8a">
                  Admin Dashboard
                </Typography>
                <Typography variant="body2" color="#3b82f6">
                  Manage books, categories, users and orders
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              to="/admin/dashboard"
              variant="contained"
              sx={{
                bgcolor: "#2563eb",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              Go to Admin
            </Button>
          </Paper>
        )}

        {/* Account Sections */}
        {sections.map((section, idx) => (
          <Paper
            key={section.title}
            elevation={0}
            sx={{
              borderRadius: 3,
              mb: 3,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 2.5, py: 1.75, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <Typography fontWeight={700} fontSize={13} color="#64748b" textTransform="uppercase" letterSpacing={0.8}>
                {section.title}
              </Typography>
            </Box>
            <List disablePadding>
              {section.items.map((item, itemIdx) => (
                <Box key={item.label}>
                  <ListItemButton
                    component={Link}
                    to={item.to}
                    sx={{
                      py: 1.75,
                      px: 2.5,
                      "&:hover": { backgroundColor: "#f1f5f9" },
                    }}
                  >
                    <ListItemIcon sx={{ color: "#2563eb", minWidth: 42 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography fontWeight={600} color="#0f172a">{item.label}</Typography>}
                      secondary={item.sub ? <Typography variant="caption" color="#64748b">{item.sub}</Typography> : null}
                    />
                    <ChevronRight sx={{ color: "#94a3b8" }} />
                  </ListItemButton>
                  {itemIdx < section.items.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        ))}

        {/* Logout Button */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #fee2e2",
            overflow: "hidden",
          }}
        >
          <ListItemButton
            onClick={() => setConfirmOpen(true)}
            sx={{
              py: 2,
              px: 2.5,
              color: "#dc2626",
              "&:hover": { backgroundColor: "#fef2f2" },
            }}
          >
            <ListItemIcon sx={{ color: "#dc2626", minWidth: 42 }}>
              <Logout />
            </ListItemIcon>
            <ListItemText
              primary={<Typography fontWeight={700}>Log out from this device</Typography>}
              secondary={<Typography variant="caption" color="#991b1b">You can log back in anytime</Typography>}
            />
          </ListItemButton>
        </Paper>

        {/* Logout Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle fontWeight={700}>Log out of BookStore?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out? Your saved items and active cart will remain attached to your account when you log back in.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
              Cancel
            </Button>
            <Button onClick={handleLogout} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: 2 }}>
              Log out
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default Account;