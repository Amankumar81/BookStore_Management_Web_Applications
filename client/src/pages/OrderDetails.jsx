import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import {
  ArrowBack,
  CancelOutlined,
  Check,
  CheckCircle,
  ContentCopy,
  Download,
  LocalShippingOutlined,
  LocationOnOutlined,
  MenuBook,
  OpenInNew,
  PaymentsOutlined,
  Person,
  QrCode2,
  ReceiptLongOutlined,
  ShoppingBagOutlined,
  AccessTime,
  LocalOfferOutlined,
} from "@mui/icons-material";

const API_URL = "https://bookstore-management-web-applications.onrender.com";

const STATUS_STEPS = ["Pending", "Processing", "Shipped", "Delivered"];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (date) => {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Date unavailable";
  }

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDay = (date) => {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Not available";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (book) => {
  const raw =
    (typeof book?.image === "string" ? book.image : book?.image?.url) ||
    (typeof book?.images?.[0] === "string"
      ? book.images[0]
      : book?.images?.[0]?.url) ||
    "";

  if (!raw) return "";

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  return `${API_URL}/${raw.replace(/^\/+/, "")}`;
};

const getStatusColor = (status) => {
  const colors = {
    Delivered: { bg: "#dcfce7", color: "#166534" },
    Cancelled: { bg: "#fee2e2", color: "#991b1b" },
    Shipped: { bg: "#dbeafe", color: "#1d4ed8" },
    Processing: { bg: "#ede9fe", color: "#6d28d9" },
  };

  return colors[status] || { bg: "#fef3c7", color: "#92400e" };
};

const getPaymentColor = (status) => {
  const colors = {
    Paid: { bg: "#dcfce7", color: "#166534" },
    Failed: { bg: "#fee2e2", color: "#991b1b" },
    Refunded: { bg: "#dbeafe", color: "#1d4ed8" },
  };

  return colors[status] || { bg: "#fef3c7", color: "#92400e" };
};

const getDiscountLabel = (coupon) => {
  if (!coupon || typeof coupon !== "object") return "";

  if (coupon.discountType === "percentage") {
    return `${Number(coupon.discountValue || 0)}% off`;
  }

  if (coupon.discountType === "fixed") {
    return `${money(coupon.discountValue)} off`;
  }

  return "";
};

function SectionCard({ icon, title, subtitle, action, children, sx = {} }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        minWidth: 0,
        border: "1px solid #e5eaf2",
        borderRadius: 2.5,
        bgcolor: "#fff",
        boxShadow: "0 3px 12px rgba(15,23,42,0.025)",
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 33,
              height: 33,
              flexShrink: 0,
              borderRadius: 1.75,
              bgcolor: "#f1f5f9",
              color: "#475569",
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#172033",
                lineHeight: 1.35,
              }}
            >
              {title}
            </Typography>

            {subtitle && (
              <Typography sx={{ fontSize: 11, color: "#94a3b8", mt: 0.2 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {action}
      </Box>

      {children}
    </Paper>
  );
}

function Thumb({ book }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(book);

  return (
    <Box
      sx={{
        width: 52,
        height: 66,
        flexShrink: 0,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        borderRadius: 1.5,
        bgcolor: "#f8fafc",
        display: "grid",
        placeItems: "center",
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={book?.title || "Book"}
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <MenuBook sx={{ color: "#94a3b8" }} />
      )}
    </Box>
  );
}

function InfoRow({ label, value, valueColor, bold = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#64748b" }}>
        {label}
      </Typography>

      <Typography
        sx={{
          fontSize: 12,
          fontWeight: bold ? 800 : 600,
          color: valueColor || "#172033",
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [qrError, setQrError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        if (!id) {
          throw new Error("Order ID is missing.");
        }

        const response = await fetch(`${API_URL}/api/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load order.");
        }

        setOrder(data.order || null);
      } catch (err) {
        console.error("Order Details Error:", err);
        setError(err.message || "Unable to load order.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token || !id) return;

        const response = await fetch(`${API_URL}/api/orders/${id}/qr`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to generate QR code.");
        }

        setQrCode(data.qrCode || "");
      } catch (err) {
        console.error("QR Code Error:", err);
        setQrError(err.message || "Unable to generate QR code.");
      } finally {
        setQrLoading(false);
      }
    };

    fetchQR();
  }, [id]);

  const handleCopy = async (text, key) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(key);

      window.setTimeout(() => {
        setCopied((current) => (current === key ? "" : current));
      }, 1800);
    } catch (err) {
      console.error("Copy Error:", err);
      setError("Unable to copy. Please copy the text manually.");
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `order-${order?._id || "qr"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = async () => {
    try {
      setCancelLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/orders/${id}/cancel`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to cancel order.");
      }

      setOrder(data.order || null);
      setCancelOpen(false);
    } catch (err) {
      console.error("Cancel Order Error:", err);
      setError(err.message || "Unable to cancel order.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          bgcolor: "#f8fafc",
        }}
      >
        <Stack alignItems="center" spacing={1.5}>
          <CircularProgress size={30} sx={{ color: "#4f46e5" }} />
          <Typography sx={{ color: "#64748b", fontSize: 12 }}>
            Loading your order...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ minHeight: "65vh", bgcolor: "#f8fafc", py: 5 }}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              textAlign: "center",
              borderRadius: 3,
              border: "1px solid #e5eaf2",
            }}
          >
            <ReceiptLongOutlined sx={{ fontSize: 42, color: "#64748b" }} />

            <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 800 }}>
              Unable to load order
            </Typography>

            <Typography sx={{ mt: 1, color: "#b91c1c", fontSize: 12 }}>
              {error || "Order not found."}
            </Typography>

            <Button
              component={Link}
              to="/orders"
              variant="contained"
              sx={{
                mt: 2.5,
                bgcolor: "#172033",
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Back to My Orders
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const currentStatus = order.orderStatus || "Pending";
  const currentStatusIndex = STATUS_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "Cancelled";
  const canCancel = ["Pending", "Processing"].includes(currentStatus);

  const statusStyle = getStatusColor(currentStatus);
  const paymentStyle = getPaymentColor(order.paymentStatus);
  const statusHistory = order.statusHistory || [];
  const shortId = String(order._id || "").slice(-8).toUpperCase();

  // This is the only value the customer-facing Copy ID buttons should copy.
  const displayOrderId = `#${shortId}`;

  const totalItems =
    order.totalItems ??
    order.orderItems?.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    ) ??
    0;

  const appliedCoupon = order.appliedCoupon || order.coupon || null;

  const couponCode =
    (typeof appliedCoupon === "string"
      ? appliedCoupon
      : appliedCoupon?.code || appliedCoupon?.couponCode) ||
    order.couponCode ||
    order.appliedCouponCode ||
    "";

  const couponDiscount = Math.max(
    0,
    Number(
      order.appliedCoupon?.discountAmount ??
        order.coupon?.discountAmount ??
        order.discountAmount ??
        order.couponDiscount ??
        order.discount ??
        0
    ) || 0
  );

  const itemSubtotal = (order.orderItems || []).reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const savedSubtotal = Number(order.subtotal);

  const orderSubtotal =
    order.subtotal !== undefined &&
    order.subtotal !== null &&
    Number.isFinite(savedSubtotal) &&
    savedSubtotal >= 0
      ? savedSubtotal
      : itemSubtotal;

  const discountLabel = getDiscountLabel(appliedCoupon);

  const addressLines = [
    order.shippingAddress?.address,
    [
      order.shippingAddress?.city,
      order.shippingAddress?.state,
    ]
      .filter(Boolean)
      .join(", ") +
      (order.shippingAddress?.postalCode
        ? ` - ${order.shippingAddress.postalCode}`
        : ""),
    order.shippingAddress?.country,
  ].filter(Boolean);

  const addressText = [
    order.shippingAddress?.fullName,
    order.shippingAddress?.phone,
    ...addressLines,
  ]
    .filter(Boolean)
    .join("\n");

  const tracking = order.tracking || {};
  const carrier = tracking.carrier || order.carrier || "";
  const trackingNumber =
    tracking.trackingNumber || order.trackingNumber || "";
  const trackingUrl = tracking.trackingUrl || order.trackingUrl || "";

  const estimatedDelivery =
    tracking.estimatedDeliveryAt ||
    tracking.expectedDate ||
    order.expectedDeliveryAt ||
    order.expectedDate ||
    "";

  const shippedAt = tracking.shippedAt || order.shippedAt || "";

  const deliveredAt =
    order.deliveredAt ||
    order.deliveredDate ||
    tracking.deliveredAt ||
    "";

  const getStepDate = (status) => {
    const entry = statusHistory.find((item) => item.status === status);

    if (entry?.changedAt) return formatDay(entry.changedAt);
    if (status === "Pending") return formatDay(order.createdAt);

    return "";
  };

  return (
       <Box
         sx={{
           minHeight: "80vh",
           bgcolor: "#f8fafc",
           py: { xs: 1.75, md: 2.5 },
       
           // Slightly improve readability throughout the order details page.
           "& .MuiTypography-root": {
             fontSize: "1.05em",
           },
           "& .MuiButton-root": {
             fontSize: "1.05em",
           },
           "& .MuiChip-label": {
             fontSize: "1.05em",
           },
         }}
       >
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2.5, lg: 4 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.75,
          }}
        >
          <Button
            component={Link}
            to="/orders"
            startIcon={<ArrowBack />}
            sx={{
              color: "#475569",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12,
              px: 0,
            }}
          >
            My Orders
          </Button>

        </Box>

        {/* ORDER HEADER */}
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            borderRadius: 2.5,
            mb: 2,
            color: "#172033",
            border: "1px solid #e5eaf2",
            background:
              "radial-gradient(circle at 90% 0%, rgba(199,210,254,0.4), transparent 35%), linear-gradient(120deg, #ffffff, #f5f7ff)",
          }}
        >
          <Box
            sx={{
              p: { xs: 1.75, sm: 2.5 },
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 1.75,
            }}
          >
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 22, sm: 27 },
                    fontWeight: 900,
                    letterSpacing: "-0.7px",
                  }}
                >
                  Order {displayOrderId}
                </Typography>

                <Chip
                  size="small"
                  label={currentStatus}
                  sx={{
                    bgcolor: statusStyle.bg,
                    color: statusStyle.color,
                    fontWeight: 800,
                    height: 23,
                    fontSize: 10.5,
                  }}
                />
              </Box>

              <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 11.5 }}>
                Placed {formatDateTime(order.createdAt)}
              </Typography>

              {/* UPPER COPY ID BUTTON: wider on desktop, full-width on mobile */}
              <Box
                sx={{
                  mt: 1.25,
                  display: "flex",
                  width: "100%",
                  maxWidth: { xs: "100%", sm: 260 },
                }}
              >
                <Button
                  size="medium"
                  variant="outlined"
                  fullWidth
                  onClick={() => handleCopy(displayOrderId, "header")}
                  startIcon={
                    copied === "header" ? <Check /> : <ContentCopy />
                  }
                  sx={{
                    width: "100%",
                    minWidth: { xs: 0, sm: 220 },
                    minHeight: 42,
                    px: 3,
                    py: 1,
                    borderColor: "#cbd5e1",
                    color: "#334155",
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: "#818cf8",
                      bgcolor: "#eef2ff",
                    },
                  }}
                >
                  {copied === "header" ? "Copied!" : "Copy Order ID"}
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                minWidth: { md: 175 },
                textAlign: { xs: "left", md: "right" },
                p: { xs: 1.25, md: 0 },
                borderRadius: 2,
                bgcolor: { xs: "#eef2ff", md: "transparent" },
                width: { xs: "100%", md: "auto" },
              }}
            >
              <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>
                TOTAL AMOUNT
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: 27, md: 31 },
                  fontWeight: 900,
                  lineHeight: 1.35,
                  letterSpacing: "-0.7px",
                }}
              >
                {money(order.totalPrice)}
              </Typography>

              <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
                {couponCode && couponDiscount > 0
                  ? ` · Saved ${money(couponDiscount)}`
                  : ""}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{ mb: 1.75, borderRadius: 2, fontSize: 12 }}
          >
            {error}
          </Alert>
        )}

        {/* DELIVERY PROGRESS */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            border: "1px solid #e5eaf2",
            borderRadius: 2.5,
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              mb: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#172033" }}>
                Order journey
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 11, color: "#94a3b8" }}>
                From confirmation to delivery
              </Typography>
            </Box>

            {!isCancelled && (
              <Chip
                size="small"
                label={`${Math.max(0, currentStatusIndex + 1)}/4 steps`}
                sx={{
                  bgcolor: "#eef2ff",
                  color: "#4338ca",
                  fontWeight: 800,
                  fontSize: 10,
                }}
              />
            )}
          </Box>

          {isCancelled ? (
            <Alert severity="error" sx={{ py: 0.25, fontSize: 12 }}>
              This order is cancelled.
              {order.paymentStatus === "Refunded" &&
                " Payment has been refunded."}
            </Alert>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: { xs: 0.5, sm: 1.5 },
              }}
            >
              {STATUS_STEPS.map((status, index) => {
                const completed = currentStatusIndex >= index;
                const active = currentStatusIndex === index;

                return (
                  <Box key={status} sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        height: 4,
                        borderRadius: 10,
                        mb: 1,
                        bgcolor: completed ? "#6366f1" : "#e9edf5",
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          placeItems: "center",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          flexShrink: 0,
                          bgcolor: completed ? "#eef2ff" : "#f1f5f9",
                          color: completed ? "#4f46e5" : "#94a3b8",
                        }}
                      >
                        {completed ? (
                          <Check sx={{ fontSize: 14 }} />
                        ) : (
                          <Typography sx={{ fontSize: 9, fontWeight: 800 }}>
                            {index + 1}
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        sx={{
                          fontSize: { xs: 9.5, sm: 11.5 },
                          fontWeight: active ? 800 : 600,
                          color: completed ? "#172033" : "#94a3b8",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {status}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        mt: 0.6,
                        fontSize: 9.5,
                        color: "#94a3b8",
                        minHeight: 13,
                      }}
                    >
                      {completed ? getStepDate(status) : ""}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* MAIN CONTENT */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 1.5fr) minmax(275px, 0.8fr)",
            },
            alignItems: "start",
            gap: 2,
          }}
        >
          {/* LEFT COLUMN */}
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <SectionCard
              icon={<ShoppingBagOutlined fontSize="small" />}
              title="Order items"
              subtitle={`${totalItems} items in this order`}
            >
              {!order.orderItems?.length ? (
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                  No order items found.
                </Typography>
              ) : (
                <Stack
                  divider={<Divider sx={{ borderColor: "#edf0f5" }} />}
                  spacing={1.4}
                >
                  {order.orderItems.map((item, index) => {
                    const book = item.book;
                    const price = Number(item.price || 0);
                    const quantity = Number(item.quantity || 0);

                    return (
                      <Box
                        key={`${order._id}-${index}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          minWidth: 0,
                        }}
                      >
                        <Thumb book={book} />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            component={book?._id ? Link : "p"}
                            to={book?._id ? `/books/${book._id}` : undefined}
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              color: "#172033",
                              fontWeight: 800,
                              fontSize: 12.5,
                              textDecoration: "none",
                              "&:hover": { color: "#4f46e5" },
                            }}
                          >
                            {book?.title || "Book"}
                          </Typography>

                          {book?.author && (
                            <Typography sx={{ mt: 0.25, fontSize: 11, color: "#94a3b8" }}>
                              {book.author}
                            </Typography>
                          )}

                          <Typography sx={{ mt: 0.5, fontSize: 11, color: "#64748b" }}>
                            {quantity} × {money(price)}
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            color: "#172033",
                          }}
                        >
                          {money(price * quantity)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>

            {/* SHIPMENT */}
            <SectionCard
              icon={<LocalShippingOutlined fontSize="small" />}
              title="Shipment tracking"
              subtitle="Carrier and delivery information"
            >
              {carrier || trackingNumber || trackingUrl || estimatedDelivery ? (
                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      p: 1.25,
                      bgcolor: "#f8faff",
                      border: "1px solid #e7eaff",
                      borderRadius: 2,
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: "#e0e7ff",
                        color: "#4338ca",
                      }}
                    >
                      <LocalShippingOutlined fontSize="small" />
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10, color: "#94a3b8" }}>
                        DELIVERY PARTNER
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#172033" }}>
                        {carrier || "Carrier not assigned"}
                      </Typography>
                    </Box>
                  </Box>

                  {trackingNumber && (
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#64748b", mb: 0.5 }}>
                        Tracking number
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                          p: 1,
                          border: "1px solid #e5eaf2",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {trackingNumber}
                        </Typography>

                        <Button
                          size="small"
                          onClick={() => handleCopy(trackingNumber, "tracking")}
                          sx={{ minWidth: 30, p: 0.5, textTransform: "none" }}
                        >
                          {copied === "tracking" ? (
                            <Check fontSize="small" />
                          ) : (
                            <ContentCopy fontSize="small" />
                          )}
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {estimatedDelivery && (
                    <InfoRow
                      label="Estimated delivery"
                      value={formatDay(estimatedDelivery)}
                      valueColor="#166534"
                      bold
                    />
                  )}

                  {shippedAt && (
                    <InfoRow label="Shipped on" value={formatDay(shippedAt)} />
                  )}

                  {trackingUrl && (
                    <Button
                      component="a"
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      endIcon={<OpenInNew />}
                      fullWidth
                      sx={{
                        py: 0.9,
                        bgcolor: "#172033",
                        borderRadius: 2,
                        textTransform: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#3730a3", boxShadow: "none" },
                      }}
                    >
                      Track shipment
                    </Button>
                  )}
                </Stack>
              ) : (
                <Box
                  sx={{
                    py: 2,
                    px: 1.5,
                    textAlign: "center",
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                  }}
                >
                  <LocalShippingOutlined sx={{ fontSize: 28, color: "#94a3b8" }} />
                  <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 700 }}>
                    Tracking not available yet
                  </Typography>
                  <Typography sx={{ mt: 0.35, fontSize: 11, color: "#94a3b8" }}>
                    Shipment details will appear when added by the store.
                  </Typography>
                </Box>
              )}
            </SectionCard>

            {/* DELIVERY ADDRESS */}
            <SectionCard
              icon={<LocationOnOutlined fontSize="small" />}
              title="Delivery address"
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.1 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  <Person fontSize="small" />
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#172033" }}>
                    {order.shippingAddress?.fullName || "Customer"}
                  </Typography>

                  {order.shippingAddress?.phone && (
                    <Typography sx={{ mt: 0.25, fontSize: 11, color: "#64748b" }}>
                      {order.shippingAddress.phone}
                    </Typography>
                  )}

                  <Typography
                    sx={{
                      mt: 0.65,
                      fontSize: 11.5,
                      lineHeight: 1.8,
                      color: "#475569",
                    }}
                  >
                    {addressLines.join(", ") || "Address unavailable"}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  onClick={() => handleCopy(addressText, "address")}
                  sx={{
                    minWidth: 0,
                    px: 0.75,
                    textTransform: "none",
                    fontSize: 11,
                  }}
                >
                  {copied === "address" ? "Copied" : "Copy"}
                </Button>
              </Box>
            </SectionCard>

            {/* ACTIVITY */}
            <SectionCard
              icon={<AccessTime fontSize="small" />}
              title="Order activity"
              subtitle="Status change history"
            >
              {statusHistory.length === 0 ? (
                <Typography sx={{ fontSize: 11.5, color: "#94a3b8" }}>
                  No status history available.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {[...statusHistory].reverse().map((history, index, list) => {
                    const style = getStatusColor(history.status);

                    return (
                      <Box
                        key={`${history.status}-${index}`}
                        sx={{ display: "flex", gap: 1.1 }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              bgcolor: style.bg,
                              color: style.color,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <CheckCircle sx={{ fontSize: 14 }} />
                          </Box>

                          {index !== list.length - 1 && (
                            <Box
                              sx={{
                                flex: 1,
                                width: 1,
                                minHeight: 12,
                                bgcolor: "#e2e8f0",
                                mt: 0.5,
                              }}
                            />
                          )}
                        </Box>

                        <Box sx={{ flex: 1, pb: index === list.length - 1 ? 0 : 0.5 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#172033" }}>
                            {history.status}
                          </Typography>

                          <Typography sx={{ mt: 0.25, fontSize: 10.5, color: "#94a3b8" }}>
                            {formatDateTime(history.changedAt)}
                          </Typography>

                          {history.note && (
                            <Typography sx={{ mt: 0.4, fontSize: 11, color: "#64748b" }}>
                              {history.note}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>
          </Stack>

          {/* RIGHT COLUMN */}
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            {/* PAYMENT SUMMARY */}
            <SectionCard
              icon={<PaymentsOutlined fontSize="small" />}
              title="Payment summary"
              subtitle="Order amount breakdown"
            >
              <Stack spacing={1.25}>
                <InfoRow
                  label="Payment method"
                  value={order.paymentMethod || "COD"}
                />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                    Payment status
                  </Typography>

                  <Chip
                    size="small"
                    label={order.paymentStatus || "Pending"}
                    sx={{
                      height: 22,
                      fontSize: 10,
                      bgcolor: paymentStyle.bg,
                      color: paymentStyle.color,
                      fontWeight: 800,
                    }}
                  />
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: "#edf0f5" }} />

              <Stack spacing={1.25}>
                <InfoRow label="Subtotal" value={money(orderSubtotal)} />

                <Box
                  sx={{
                    p: 1.25,
                    border: "1px solid #d1fae5",
                    bgcolor: "#f0fdf4",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                    <LocalOfferOutlined sx={{ fontSize: 16, color: "#15803d" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>
                      Coupon & savings
                    </Typography>
                  </Box>

                  {couponCode ? (
                    <Stack spacing={0.9}>
                      <InfoRow label="Coupon applied" value={couponCode} bold />

                      {discountLabel && (
                        <InfoRow label="Offer" value={discountLabel} />
                      )}

                      <InfoRow
                        label="Discount"
                        value={`−${money(couponDiscount)}`}
                        valueColor="#15803d"
                        bold
                      />
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                      No coupon code was recorded for this order.
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ borderColor: "#edf0f5" }} />

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    color: "#172033",
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: "#64748b" }}>
                    FINAL ORDER TOTAL
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: 26,
                      fontWeight: 900,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {money(order.totalPrice)}
                  </Typography>

                  {couponCode && couponDiscount > 0 && (
                    <Typography sx={{ mt: 0.3, fontSize: 10.5, color: "#15803d" }}>
                      You saved {money(couponDiscount)} with this coupon.
                    </Typography>
                  )}
                </Box>

                {deliveredAt && (
                  <Alert severity="success" sx={{ py: 0.2, fontSize: 11 }}>
                    Delivered on {formatDateTime(deliveredAt)}
                  </Alert>
                )}
              </Stack>
            </SectionCard>

            {/* QR PASS */}
            <Paper
              elevation={0}
              sx={{
                overflow: "hidden",
                border: "1px solid #e5eaf2",
                borderRadius: 2.5,
                bgcolor: "#fff",
              }}
            >
              <Box
                sx={{
                  px: 1.75,
                  py: 1.5,
                  color: "#172033",
                  bgcolor: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "#fff",
                    color: "#4f46e5",
                  }}
                >
                  <QrCode2 />
                </Avatar>

                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    Digital order pass
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>
                    Your order identification QR
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ p: 1.75, textAlign: "center" }}>
                {qrLoading ? (
                  <CircularProgress size={26} />
                ) : qrError ? (
                  <Alert severity="error" sx={{ textAlign: "left", fontSize: 11 }}>
                    {qrError}
                  </Alert>
                ) : qrCode ? (
                  <>
                    <Box
                      sx={{
                        position: "relative",
                        display: "inline-flex",
                        p: 0.75,
                        border: "1px solid #e5e7eb",
                        borderRadius: 2,
                        bgcolor: "#fff",
                      }}
                    >
                      <Box
                        component="img"
                        src={qrCode}
                        alt="Order QR code"
                        sx={{
                          display: "block",
                          width: 145,
                          height: 145,
                          maxWidth: "100%",
                          opacity: isCancelled ? 0.25 : 1,
                          filter: isCancelled ? "grayscale(1)" : "none",
                        }}
                      />

                      {isCancelled && (
                        <Chip
                          label="Cancelled"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: "45%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            bgcolor: "#fee2e2",
                            color: "#991b1b",
                            fontWeight: 800,
                          }}
                        />
                      )}
                    </Box>

                    <Typography sx={{ mt: 0.8, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
                      {displayOrderId}
                    </Typography>

                    <Typography sx={{ mt: 0.35, fontSize: 10, color: "#94a3b8" }}>
                      Keep this code available for delivery verification.
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
                      <Button
                        size="small"
                        fullWidth
                        variant="contained"
                        onClick={handleDownloadQR}
                        startIcon={<Download />}
                        sx={{
                          bgcolor: "#172033",
                          textTransform: "none",
                          fontSize: 11,
                          fontWeight: 700,
                          boxShadow: "none",
                          "&:hover": { bgcolor: "#3730a3", boxShadow: "none" },
                        }}
                      >
                        Download
                      </Button>

                      {/* IMPORTANT: copy displayOrderId, never order._id */}
                      <Button
                        size="small"
                        fullWidth
                        variant="outlined"
                        onClick={() => handleCopy(displayOrderId, "qr")}
                        startIcon={
                          copied === "qr" ? <Check /> : <ContentCopy />
                        }
                        sx={{
                          borderColor: "#dbe1eb",
                          color: "#334155",
                          textTransform: "none",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {copied === "qr" ? "Copied!" : "Copy ID"}
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ py: 2, color: "#94a3b8", fontSize: 11.5 }}>
                    QR code unavailable.
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* CANCEL ORDER */}
            {canCancel && (
              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: "1px solid #fecaca",
                  bgcolor: "#fff",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "#fef2f2",
                      color: "#dc2626",
                    }}
                  >
                    <CancelOutlined fontSize="small" />
                  </Avatar>

                  <Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#991b1b" }}>
                      Cancel order
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: "#94a3b8" }}>
                      Available before shipment
                    </Typography>
                  </Box>
                </Box>

                <Typography sx={{ mt: 1, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                  You can cancel while your order is Pending or Processing.
                </Typography>

                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => setCancelOpen(true)}
                  sx={{
                    mt: 1.25,
                    py: 0.75,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Cancel this order
                </Button>
              </Paper>
            )}
          </Stack>
        </Box>
      </Container>

      {/* CANCELLATION CONFIRMATION */}
      <Dialog
        open={cancelOpen}
        onClose={() => !cancelLoading && setCancelOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 0.5,
            width: "100%",
            maxWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 800 }}>
          Cancel this order?
        </DialogTitle>

        <DialogContent>
          <DialogContentText sx={{ fontSize: 12.5, lineHeight: 1.7 }}>
            Order {displayOrderId} will be cancelled. Depending on your order
            workflow, the books may be returned to stock. This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button
            onClick={() => setCancelOpen(false)}
            disabled={cancelLoading}
            sx={{ textTransform: "none", color: "#64748b" }}
          >
            Keep order
          </Button>

          <Button
            onClick={handleCancel}
            disabled={cancelLoading}
            variant="contained"
            color="error"
            startIcon={
              cancelLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CancelOutlined />
              )
            }
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {cancelLoading ? "Cancelling..." : "Confirm cancellation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OrderDetails;
