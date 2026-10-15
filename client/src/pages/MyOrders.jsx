import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Stack,
  Chip,
} from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForward";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import Search from "@mui/icons-material/Search";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import AssignmentReturnOutlined from "@mui/icons-material/AssignmentReturnOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import { Link, useNavigate } from "react-router-dom";

const RETURN_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

// If your site navbar is fixed/sticky, set its height here (in px)
// so the pinned search + tabs sit just below it. Use 0 if the navbar scrolls away.
const STICKY_TOP = 0;

const STATUSES = [
  "All",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Pending",
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getCouponDetails = (order) => {
  const coupon = order?.appliedCoupon || {};
  const code = String(coupon.code || "").trim();
  const discount = Number(coupon.discountAmount || 0);
  const total = Number(order?.totalPrice || 0);

  return {
    code,
    discount: Number.isFinite(discount) && discount > 0 ? discount : 0,
    total: Number.isFinite(total) ? total : 0,
    hasCoupon: Boolean(code),
  };
};

const getTrackingDetails = (order) => {
  const tracking = order?.tracking || {};
  const carrier = tracking.carrier || order?.carrier || "";
  const trackingNumber =
    tracking.trackingNumber || order?.trackingNumber || "";
  const estimatedDelivery =
    tracking.estimatedDeliveryAt ||
    tracking.expectedDate ||
    order?.estimatedDeliveryAt ||
    order?.expectedDate ||
    "";

  return {
    carrier,
    trackingNumber,
    estimatedDelivery: formatDate(estimatedDelivery),
    hasDetails: Boolean(carrier || trackingNumber || estimatedDelivery),
  };
};

const getDeliveryDate = (order) => {
  const candidates = [
    order?.deliveredAt,
    order?.tracking?.deliveredAt,
    order?.delivery?.deliveredDate,
    ...(order?.statusHistory || [])
      .filter((entry) => entry.status === "Delivered")
      .map((entry) => entry.changedAt),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const getReturnWindow = (order) => {
  const deliveredAt = getDeliveryDate(order);
  if (!deliveredAt) return { eligible: false, deadline: null };

  const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_MS);
  return { eligible: Date.now() <= deadline.getTime(), deadline };
};

const getStatusChip = (status) => {
  const normalizedStatus = (status || "Pending").toLowerCase();

  let backgroundColor = "#fef3c7";
  let color = "#92400e";
  let icon = <ScheduleOutlined sx={{ fontSize: 15 }} />;

  if (normalizedStatus === "delivered") {
    backgroundColor = "#dcfce7";
    color = "#166534";
    icon = <CheckCircle sx={{ fontSize: 15 }} />;
  } else if (normalizedStatus === "shipped") {
    backgroundColor = "#dbeafe";
    color = "#1d4ed8";
    icon = <LocalShippingOutlined sx={{ fontSize: 15 }} />;
  } else if (normalizedStatus === "cancelled") {
    backgroundColor = "#fee2e2";
    color = "#991b1b";
    icon = <CancelOutlined sx={{ fontSize: 15 }} />;
  } else if (normalizedStatus === "processing") {
    backgroundColor = "#ede9fe";
    color = "#6d28d9";
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.2,
        py: 0.4,
        borderRadius: 2,
        backgroundColor,
        color,
        fontSize: 11.5,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {icon}
      {status || "Pending"}
    </Box>
  );
};

function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please login to view your orders.");
        }

        const response = await fetch(
          "https://bookstore-management-web-applications.onrender.com/api/orders/my-orders",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const text = await response.text();
        let data;

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            "The server returned an unexpected response while loading orders."
          );
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load orders.");
        }

        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err) {
        console.error("My Orders Error:", err);
        setError(err.message || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const currentTabStatus = STATUSES[tabValue];
    const query = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesTab =
        currentTabStatus === "All" ||
        (order.orderStatus || "Pending").toLowerCase() ===
          currentTabStatus.toLowerCase();

      if (!query) return matchesTab;

      const matchesId = String(order._id || "").toLowerCase().includes(query);

      const matchesItems = order.orderItems?.some(
        (item) =>
          item.book?.title?.toLowerCase().includes(query) ||
          item.book?.author?.toLowerCase().includes(query)
      );

      const matchesCoupon = String(order.appliedCoupon?.code || "")
        .toLowerCase()
        .includes(query);

      return matchesTab && (matchesId || matchesItems || matchesCoupon);
    });
  }, [orders, tabValue, searchQuery]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <CircularProgress size={38} sx={{ color: "#111827" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "80vh", backgroundColor: "#f8fafc" }}>
      {/* ===== Sticky header: title + search + tabs ===== */}
      <Box
        sx={{
          position: "sticky",
          top: STICKY_TOP,
          zIndex: 20,
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
          pt: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: 24, sm: 30 },
                  fontWeight: 900,
                  color: "#111827",
                  letterSpacing: "-0.8px",
                  lineHeight: 1.2,
                }}
              >
                My Orders
              </Typography>

              <Typography sx={{ color: "#64748b", fontSize: 14 }}>
                Track, inspect, and manage your BookStore purchases.
              </Typography>
            </Box>

            {!error && orders.length > 0 && (
              <TextField
                placeholder="Search by book, author, coupon, ID..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                size="small"
                sx={{
                  width: { xs: "100%", sm: 300 },
                  backgroundColor: "#ffffff",
                  borderRadius: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontSize: 14,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </Box>

          {!error && orders.length > 0 && (
            <Tabs
              value={tabValue}
              onChange={(event, value) => setTabValue(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 44,
                "& .MuiTab-root": {
                  minHeight: 44,
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: "none",
                  color: "#64748b",
                  "&.Mui-selected": { color: "#111827" },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#111827",
                  height: 3,
                  borderRadius: 1.5,
                },
              }}
            >
              {STATUSES.map((status) => {
                const count =
                  status === "All"
                    ? orders.length
                    : orders.filter(
                        (order) =>
                          (order.orderStatus || "Pending").toLowerCase() ===
                          status.toLowerCase()
                      ).length;

                return (
                  <Tab
                    key={status}
                    label={`${status} (${count})`}
                    disabled={count === 0 && status !== "All"}
                  />
                );
              })}
            </Tabs>
          )}
        </Container>
      </Box>

      {/* ===== Scrollable content ===== */}
      <Container
        maxWidth="lg"
        sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2.5, md: 3 } }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            {!localStorage.getItem("token") && (
              <Button component={Link} to="/login" sx={{ ml: 1 }}>
                Login Now
              </Button>
            )}
          </Alert>
        )}

        {!error && filteredOrders.length === 0 && (
          <Card
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              boxShadow: "none",
              backgroundColor: "#fff",
            }}
          >
            <CardContent sx={{ py: { xs: 6, sm: 8 }, textAlign: "center" }}>
              <ShoppingBagOutlined
                sx={{ fontSize: 42, color: "#475569", mb: 1 }}
              />

              <Typography
                sx={{ fontSize: 22, fontWeight: 900, color: "#111827" }}
              >
                {searchQuery ? "No matching orders found" : "No orders yet"}
              </Typography>

              <Typography sx={{ mt: 1, color: "#64748b", fontSize: 15 }}>
                {searchQuery
                  ? "Try checking your spelling or search terms."
                  : "You haven't placed any orders yet."}
              </Typography>

              {!searchQuery && (
                <Button
                  component={Link}
                  to="/books"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  sx={{
                    mt: 3,
                    px: 3,
                    py: 1.2,
                    borderRadius: 2,
                    backgroundColor: "#111827",
                    textTransform: "none",
                    fontWeight: 800,
                    "&:hover": { backgroundColor: "#000" },
                  }}
                >
                  Start Shopping
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!error && filteredOrders.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2.5,
            }}
          >
            {filteredOrders.map((order) => {
              const delivered =
                (order.orderStatus || "").toLowerCase() === "delivered";

              const returnWindow = getReturnWindow(order);
              const tracking = getTrackingDetails(order);
              const couponDetails = getCouponDetails(order);

              const items = order.orderItems || [];
              const firstItem = items[0];
              const extraItems = Math.max(items.length - 1, 0);
              const totalQty = items.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
              );
              const shortId = String(order._id || "").slice(-8).toUpperCase();

              return (
                <Card
                  key={order._id}
                  onClick={() => navigate(`/orders/${order._id}`)}
                  sx={{
                    cursor: "pointer",
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    backgroundColor: "#fff",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      boxShadow: "0 10px 26px rgba(15,23,42,0.08)",
                      borderColor: "#94a3b8",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 2,
                      "&:last-child": { pb: 2 },
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      flexGrow: 1,
                    }}
                  >
                    {/* Header: short ID, date, status */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#111827",
                            fontFamily: "monospace",
                          }}
                        >
                          Order #{shortId}
                        </Typography>

                        {order.createdAt && (
                          <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                            {formatDate(order.createdAt)}
                          </Typography>
                        )}
                      </Box>

                      {getStatusChip(order.orderStatus)}
                    </Box>

                    {/* Main item summary */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.2,
                        borderRadius: 2,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <Box
                        component="img"
                        src={
                          firstItem?.book?.image ||
                          firstItem?.book?.imageUrl ||
                          "https://placehold.co/60x80?text=Book"
                        }
                        alt={firstItem?.book?.title || "Book"}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "https://placehold.co/60x80?text=Book";
                        }}
                        sx={{
                          width: 44,
                          height: 58,
                          objectFit: "cover",
                          borderRadius: 1.2,
                          flexShrink: 0,
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#e2e8f0",
                        }}
                      />

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 14.5,
                            fontWeight: 800,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {firstItem?.book?.title || "Book Item"}
                        </Typography>

                        {firstItem?.book?.author && (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: "#64748b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            by {firstItem.book.author}
                          </Typography>
                        )}

                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {extraItems > 0
                            ? `+${extraItems} more item${
                                extraItems > 1 ? "s" : ""
                              } · `
                            : ""}
                          Qty {totalQty}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 17,
                            fontWeight: 900,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{formatCurrency(couponDetails.total)}
                        </Typography>

                        {couponDetails.hasCoupon && couponDetails.discount > 0 && (
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: "#15803d",
                              fontWeight: 700,
                            }}
                          >
                            Saved ₹{formatCurrency(couponDetails.discount)}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Compact info chips */}
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                      alignItems="center"
                    >
                      <Chip
                        size="small"
                        icon={<LocalShippingOutlined sx={{ fontSize: 15 }} />}
                        label={
                          tracking.estimatedDelivery
                            ? `ETA ${tracking.estimatedDelivery}`
                            : tracking.hasDetails
                            ? tracking.carrier || "Tracking added"
                            : "Tracking pending"
                        }
                        sx={{
                          fontWeight: 700,
                          fontSize: 11.5,
                          backgroundColor: tracking.hasDetails
                            ? "#dbeafe"
                            : "#f1f5f9",
                          color: tracking.hasDetails ? "#1d4ed8" : "#64748b",
                        }}
                      />

                      {couponDetails.hasCoupon && (
                        <Chip
                          size="small"
                          icon={<LocalOfferOutlined sx={{ fontSize: 15 }} />}
                          label={couponDetails.code}
                          sx={{
                            fontWeight: 800,
                            fontSize: 11.5,
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            "& .MuiChip-icon": { color: "#166534" },
                          }}
                        />
                      )}

                      <Chip
                        size="small"
                        label={`Payment: ${order.paymentStatus || "Pending"}`}
                        sx={{
                          fontWeight: 700,
                          fontSize: 11.5,
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                        }}
                      />
                    </Stack>

                    {/* Footer actions */}
                    <Box
                      sx={{
                        mt: "auto",
                        pt: 1.2,
                        borderTop: "1px dashed #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box>
                        {delivered && returnWindow.eligible && (
                          <Button
                            component={Link}
                            to={`/returns?orderId=${order._id}`}
                            onClick={(event) => event.stopPropagation()}
                            size="small"
                            variant="outlined"
                            startIcon={<AssignmentReturnOutlined />}
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              fontWeight: 800,
                              fontSize: 12.5,
                            }}
                          >
                            Return
                          </Button>
                        )}

                        {delivered && !returnWindow.eligible && (
                          <Typography sx={{ color: "#64748b", fontSize: 12 }}>
                            {getDeliveryDate(order)
                              ? "Return window expired"
                              : "Delivery date unavailable"}
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        View details
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default MyOrders;