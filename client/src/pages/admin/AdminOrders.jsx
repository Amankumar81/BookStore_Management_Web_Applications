
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Pagination,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  IconButton,
  Divider,
  Stack,
  Tooltip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import DoneIcon from "@mui/icons-material/Done";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ClearIcon from "@mui/icons-material/Clear";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";
const ORDERS_PER_PAGE = 10;
const NEW_ORDER_HOURS = 24;
const SEEN_ORDERS_STORAGE_KEY = "bookstore_admin_seen_order_ids";

function AdminOrders() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState([]);

  const [seenOrderIds, setSeenOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem(SEEN_ORDERS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Could not load viewed order IDs:", error);
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(`${API_URL}/api/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch orders");
        }

        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err) {
        console.error("Fetch orders error:", err);
        setError(err.message || "Failed to fetch orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => fetchOrders(true), 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId, orderStatus) => {
    try {
      setUpdatingId(orderId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update order status");
      }

      setOrders((previous) =>
        previous.map((order) =>
          order._id === orderId
            ? {
                ...order,
                ...data.order,
                user: data.order.user || order.user,
                shippingAddress:
                  data.order.shippingAddress || order.shippingAddress,
              }
            : order
        )
      );
    } catch (err) {
      console.error("Update status error:", err);
      setError(err.message || "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getAvailableStatuses = (status) => {
    switch (status) {
      case "Pending":
        return ["Pending", "Processing", "Cancelled"];
      case "Processing":
        return ["Processing", "Shipped", "Cancelled"];
      case "Shipped":
        return ["Shipped", "Delivered"];
      case "Delivered":
        return ["Delivered"];
      case "Cancelled":
        return ["Cancelled"];
      default:
        return [status];
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Processing":
        return "info";
      case "Shipped":
        return "primary";
      case "Delivered":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case "Paid":
        return "success";
      case "Failed":
        return "error";
      case "Refunded":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <PendingActionsOutlinedIcon />;
      case "Processing":
        return <ShoppingBagOutlinedIcon />;
      case "Shipped":
        return <LocalShippingOutlinedIcon />;
      case "Delivered":
        return <DoneIcon />;
      case "Cancelled":
        return <CancelOutlinedIcon />;
      default:
        return <ShoppingBagOutlinedIcon />;
    }
  };

  const getOrderDate = (order) => {
    const date = new Date(order.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getDateKey = (date) => {
    if (!date) return "unknown";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Supports common coupon field names returned by the backend.
  

const getCouponDetails = (order) => {
  const coupon = order?.appliedCoupon || {};

  const code = String(coupon.code || "").trim();
  const discountAmount = Number(coupon.discountAmount || 0);

  return {
    code,
    discount: Number.isFinite(discountAmount)
      ? discountAmount
      : 0,
    discountType: coupon.discountType || "",
    discountValue: Number(coupon.discountValue || 0),
    subtotal: Number(order?.subtotal || 0),
    totalPrice: Number(order?.totalPrice || 0),
  };
};

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const today = new Date();
  const todayKey = getDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getDateKey(yesterday);

  const isRecentOrder = (order) => {
    const date = getOrderDate(order);

    if (!date) return false;

    const age = Date.now() - date.getTime();

    return age >= 0 && age <= NEW_ORDER_HOURS * 60 * 60 * 1000;
  };

  const isNewOrder = (order) =>
    isRecentOrder(order) && !seenOrderIds.includes(String(order._id));

  const handleViewOrder = (orderId) => {
    const id = String(orderId);

    if (!seenOrderIds.includes(id)) {
      const updated = [...seenOrderIds, id];

      setSeenOrderIds(updated);

      try {
        localStorage.setItem(
          SEEN_ORDERS_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error("Could not save viewed order ID:", error);
      }
    }

    navigate(`/admin/orders/${id}`);
  };

  const getDateGroupLabel = (dateKey) => {
    if (dateKey === todayKey) return "Today";
    if (dateKey === yesterdayKey) return "Yesterday";
    if (dateKey === "unknown") return "Date unavailable";

    const date = new Date(`${dateKey}T12:00:00`);

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const filteredOrders = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    const result = orders.filter((order) => {
      if (searchText) {
        const couponDetails = getCouponDetails(order);

        const searchableText = [
          order._id,
          order.user?.name,
          order.user?.email,
          order.orderStatus,
          order.paymentStatus,
          order.paymentMethod,
          order.totalPrice,
          order.totalItems,
          order.shippingAddress?.city,
          order.shippingAddress?.state,
          order.shippingAddress?.postalCode,
          couponDetails.code,
          couponDetails.discount,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");

        if (!searchableText.includes(searchText)) return false;
      }

      if (statusFilter !== "All" && order.orderStatus !== statusFilter) {
        return false;
      }

      if (paymentFilter !== "All" && order.paymentStatus !== paymentFilter) {
        return false;
      }

      const date = getOrderDate(order);
      const key = getDateKey(date);

      if (dateFilter === "Today" && key !== todayKey) return false;
      if (dateFilter === "Yesterday" && key !== yesterdayKey) return false;

      if (
        dateFilter === "Older" &&
        (key === todayKey || key === yesterdayKey)
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
          return Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
        case "priceHigh":
          return Number(b.totalPrice || 0) - Number(a.totalPrice || 0);
        case "itemsLow":
          return Number(a.totalItems || 0) - Number(b.totalItems || 0);
        case "itemsHigh":
          return Number(b.totalItems || 0) - Number(a.totalItems || 0);
        case "newest":
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [
    orders,
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
    sortBy,
    todayKey,
    yesterdayKey,
  ]);

  const groupedOrders = useMemo(() => {
    const groups = new Map();

    filteredOrders.forEach((order) => {
      const key = getDateKey(getOrderDate(order));

      if (!groups.has(key)) groups.set(key, []);

      groups.get(key).push(order);
    });

    return Array.from(groups.entries()).sort(([keyA], [keyB]) => {
      if (keyA === "unknown") return 1;
      if (keyB === "unknown") return -1;

      return keyB.localeCompare(keyA);
    });
  }, [filteredOrders]);

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.orderStatus === "Pending"
  ).length;

  const processingOrders = orders.filter(
    (order) => order.orderStatus === "Processing"
  ).length;

  const shippedOrders = orders.filter(
    (order) => order.orderStatus === "Shipped"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.orderStatus === "Delivered"
  ).length;

  const cancelledOrders = orders.filter(
    (order) => order.orderStatus === "Cancelled"
  ).length;

  const totalRevenue = orders
    .filter((order) => order.orderStatus !== "Cancelled")
    .reduce(
      (total, order) => total + Number(order.totalPrice || 0),
      0
    );

  const todayOrders = orders.filter(
    (order) => getDateKey(getOrderDate(order)) === todayKey
  ).length;

  const yesterdayOrders = orders.filter(
    (order) => getDateKey(getOrderDate(order)) === yesterdayKey
  ).length;

  const newOrders = orders.filter(isRecentOrder).length;

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const startIndex = (page - 1) * ORDERS_PER_PAGE;

  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + ORDERS_PER_PAGE
  );

  const paginatedGroups = useMemo(() => {
    const groups = new Map();

    paginatedOrders.forEach((order) => {
      const key = getDateKey(getOrderDate(order));

      if (!groups.has(key)) groups.set(key, []);

      groups.get(key).push(order);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;

      return b.localeCompare(a);
    });
  }, [paginatedOrders]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, dateFilter, sortBy]);

  const handleReset = () => {
    setSearch("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setDateFilter("All");
    setSortBy("newest");
    setPage(1);
  };

  const handleStatusCardClick = (status) => {
    setStatusFilter(status);
    setSearch("");
    setPage(1);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={42} />
        <Typography color="text.secondary">Loading orders...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f4f6ff 0%, #eef1fb 100%)",
        p: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          mb: 4,
          color: "white",
          background:
            "linear-gradient(115deg, #111827 0%, #172554 48%, #3730a3 100%)",
          boxShadow: "0 12px 35px rgba(30, 41, 59, 0.18)",
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 700,
                letterSpacing: 1,
                opacity: 0.8,
                mb: 1,
              }}
            >
              ADMIN PANEL
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "2rem", md: "2.7rem" },
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Orders 📦
            </Typography>

            <Typography sx={{ mt: 1, opacity: 0.78, maxWidth: 550 }}>
              Manage customer orders, payments, coupon discounts and delivery
              status from one place.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => navigate("/admin/qr-scanner")}
              sx={{
                bgcolor: "#7c3aed",
                fontWeight: 700,
                px: 2.5,
                "&:hover": { bgcolor: "#6d28d9" },
              }}
            >
              Scan Order QR
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.35)",
                fontWeight: 700,
                "&:hover": {
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </Stack>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

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
        <Card
          onClick={() => handleStatusCardClick("All")}
          sx={{
            cursor: "pointer",
            borderRadius: 3,
            border:
              statusFilter === "All"
                ? "2px solid #4f46e5"
                : "1px solid #e5e7eb",
          }}
        >
          <CardContent>
            <Typography color="text.secondary" fontWeight={600}>
              Total Orders
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
              {totalOrders}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click to view all
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => handleStatusCardClick("Pending")}
          sx={{
            cursor: "pointer",
            borderRadius: 3,
            border:
              statusFilter === "Pending"
                ? "2px solid #ed6c02"
                : "1px solid #e5e7eb",
          }}
        >
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography color="text.secondary" fontWeight={600}>
                  Pending
                </Typography>
                <Typography
                  variant="h4"
                  color="warning.main"
                  fontWeight={800}
                  sx={{ mt: 1 }}
                >
                  {pendingOrders}
                </Typography>
              </Box>
              <PendingActionsOutlinedIcon color="warning" fontSize="large" />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Needs processing
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => handleStatusCardClick("Delivered")}
          sx={{
            cursor: "pointer",
            borderRadius: 3,
            border:
              statusFilter === "Delivered"
                ? "2px solid #2e7d32"
                : "1px solid #e5e7eb",
          }}
        >
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography color="text.secondary" fontWeight={600}>
                  Delivered
                </Typography>
                <Typography
                  variant="h4"
                  color="success.main"
                  fontWeight={800}
                  sx={{ mt: 1 }}
                >
                  {deliveredOrders}
                </Typography>
              </Box>
              <DoneIcon color="success" fontSize="large" />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Successfully delivered
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, border: "1px solid #e5e7eb" }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography color="text.secondary" fontWeight={600}>
                  Revenue
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                  {formatCurrency(totalRevenue)}
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ color: "#7c3aed" }} fontSize="large" />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Excluding cancelled orders
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Today's orders
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {todayOrders}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Yesterday's orders
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {yesterdayOrders}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Recent orders (last 24 hours)
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800}>
              {newOrders}
            </Typography>
            {newOrders > 0 && (
              <Chip label="NEW" size="small" color="success" />
            )}
          </Stack>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <TextField
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order ID, customer, email, coupon code, city..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <Tooltip title="Clear search">
                  <IconButton onClick={() => setSearch("")} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null,
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", md: 160 } }}
          >
            <InputLabel>Order Date</InputLabel>
            <Select
              value={dateFilter}
              label="Order Date"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="All">All Dates</MenuItem>
              <MenuItem value="Today">Today</MenuItem>
              <MenuItem value="Yesterday">Yesterday</MenuItem>
              <MenuItem value="Older">Older Dates</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", md: 160 } }}
          >
            <InputLabel>Order Status</InputLabel>
            <Select
              value={statusFilter}
              label="Order Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {[
                "All",
                "Pending",
                "Processing",
                "Shipped",
                "Delivered",
                "Cancelled",
              ].map((status) => (
                <MenuItem key={status} value={status}>
                  {status === "All" ? "All Status" : status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", md: 160 } }}
          >
            <InputLabel>Payment Status</InputLabel>
            <Select
              value={paymentFilter}
              label="Payment Status"
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              {["All", "Pending", "Paid", "Failed", "Refunded"].map(
                (status) => (
                  <MenuItem key={status} value={status}>
                    {status === "All" ? "All Payments" : status}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          >
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="priceHigh">Amount: High → Low</MenuItem>
              <MenuItem value="priceLow">Amount: Low → High</MenuItem>
              <MenuItem value="itemsHigh">Items: High → Low</MenuItem>
              <MenuItem value="itemsLow">Items: Low → High</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            Reset Filters
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Box>
          <Typography fontWeight={800} variant="h6">
            Orders by Date
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing <strong>{filteredOrders.length}</strong> of{" "}
            <strong>{orders.length}</strong> orders
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`Processing ${processingOrders}`}
            color="info"
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Shipped ${shippedOrders}`}
            color="primary"
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Cancelled ${cancelledOrders}`}
            color="error"
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>

      {paginatedOrders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <ShoppingBagOutlinedIcon
            sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
          />
          <Typography fontWeight={700}>No orders found</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Try changing your search or filters.
          </Typography>
          <Button
            sx={{ mt: 2 }}
            variant="outlined"
            onClick={handleReset}
          >
            Clear Filters
          </Button>
        </Paper>
      ) : (
        paginatedGroups.map(([dateKey, dateOrders]) => (
          <Box key={dateKey} sx={{ mb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1.5,
                mb: 1,
                borderRadius: 2,
                border: "1px solid #dbe3f0",
                bgcolor: "#f8fafc",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <Typography fontWeight={800}>
                  {getDateGroupLabel(dateKey)}
                </Typography>
                <Chip
                  label={`${dateOrders.length} order${
                    dateOrders.length !== 1 ? "s" : ""
                  }`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Paper>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                overflowX: "auto",
              }}
            >
              <Table sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell>
                      <strong>Order</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Customer</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Items</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Total</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Coupon / Discount</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Payment</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Action</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {dateOrders.map((order) => (
                    <TableRow
                      key={order._id}
                      hover
                      onClick={() => handleViewOrder(order._id)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "#fafaff" },
                      }}
                    >
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography fontWeight={800}>
                            #{order._id.slice(-8).toUpperCase()}
                          </Typography>
                          {isNewOrder(order) && (
                            <Chip
                              label="NEW"
                              color="success"
                              size="small"
                            />
                          )}
                        </Stack>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {formatDate(order.createdAt)}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {formatTime(order.createdAt)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={700}>
                          {order.user?.name || "Unknown"}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {order.user?.email || "No email"}
                        </Typography>
                        {order.shippingAddress?.city && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {order.shippingAddress.city}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {(() => {
                          const count = Number(
                            order.totalItems ||
                              order.orderItems?.length ||
                              0
                          );

                          return (
                            <Chip
                              size="small"
                              label={`${count} item${
                                count !== 1 ? "s" : ""
                              }`}
                              variant="outlined"
                            />
                          );
                        })()}
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={800}>
                          {formatCurrency(order.totalPrice)}
                        </Typography>
                      </TableCell>

                      {/* Coupon code and discount amount */}
                      <TableCell>
                        {(() => {
                          const { code, discount } =
                            getCouponDetails(order);

                          if (!code && discount <= 0) {
                            return (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                No coupon applied
                              </Typography>
                            );
                          }

                          return (
                            <Stack
                              spacing={0.75}
                              alignItems="flex-start"
                            >
                              {code ? (
                                <Chip
                                  label={code}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  label="Coupon code unavailable"
                                  size="small"
                                  variant="outlined"
                                />
                              )}

                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={
                                  discount > 0
                                    ? "success.main"
                                    : "text.secondary"
                                }
                              >
                                Discount: {formatCurrency(discount)}
                              </Typography>
                            </Stack>
                          );
                        })()}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={order.paymentStatus || "Pending"}
                          color={getPaymentColor(order.paymentStatus)}
                          size="small"
                          variant="outlined"
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {order.paymentMethod || "COD"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          icon={getStatusIcon(order.orderStatus)}
                          label={order.orderStatus}
                          color={getStatusColor(order.orderStatus)}
                          size="small"
                        />
                      </TableCell>

                      <TableCell
                        align="right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                          alignItems="center"
                        >
                          <Tooltip title="View order">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleViewOrder(order._id)
                              }
                              sx={{ border: "1px solid #e2e8f0" }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Select
                            size="small"
                            value={order.orderStatus}
                            disabled={updatingId === order._id}
                            onChange={(e) =>
                              updateStatus(
                                order._id,
                                e.target.value
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            sx={{ minWidth: 135, bgcolor: "white" }}
                          >
                            {getAvailableStatuses(
                              order.orderStatus
                            ).map((status) => (
                              <MenuItem
                                key={status}
                                value={status}
                              >
                                {status}
                              </MenuItem>
                            ))}
                          </Select>

                          {updatingId === order._id && (
                            <CircularProgress size={20} />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}

      {totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 3,
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {filteredOrders.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Typography variant="body2" color="text.secondary">
              Showing{" "}
              <strong>
                {startIndex + 1}–
                {Math.min(
                  startIndex + ORDERS_PER_PAGE,
                  filteredOrders.length
                )}
              </strong>{" "}
              of <strong>{filteredOrders.length}</strong> filtered orders
            </Typography>

            <Button
              size="small"
              endIcon={
                <ArrowForwardIosIcon
                  sx={{ fontSize: "12px !important" }}
                />
              }
              onClick={() => navigate("/admin/qr-scanner")}
            >
              Open QR Scanner
            </Button>
          </Stack>
        </Paper>
      )}

      <Divider sx={{ mt: 3 }} />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        Auto-refresh runs every 30 seconds while this page is open.
      </Typography>
    </Box>
  );
}

export default AdminOrders;
