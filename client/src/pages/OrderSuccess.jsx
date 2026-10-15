import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Typography,
} from "@mui/material";

import {
  CheckCircle,
  ArrowForward,
  ShoppingBagOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";

import {
  Link,
  useLocation,
} from "react-router-dom";

function OrderSuccess() {
  const location = useLocation();

  const order = location.state?.order;

  // =========================
  // NO ORDER DATA
  // =========================
  if (!order) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          backgroundColor: "#f8fafc",
          display: "flex",
          alignItems: "center",
          py: 6,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              boxShadow: "none",
              backgroundColor: "#ffffff",
            }}
          >
            <CardContent
              sx={{
                textAlign: "center",
                py: 6,
                px: 3,
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  backgroundColor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <ReceiptLongOutlined
                  sx={{
                    fontSize: 38,
                    color: "#92400e",
                  }}
                />
              </Box>

              <Typography
                sx={{
                  fontSize: 25,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Order information unavailable
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: "#64748b",
                  fontSize: 15,
                }}
              >
                We couldn't find the order details on this page.
              </Typography>

              <Button
                component={Link}
                to="/orders"
                variant="contained"
                endIcon={<ArrowForward />}
                sx={{
                  mt: 3,
                  backgroundColor: "#111827",
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  px: 3,
                  py: 1.2,

                  "&:hover": {
                    backgroundColor: "#000000",
                  },
                }}
              >
                Go to My Orders
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const orderId = order._id || "";

  const totalPrice = order.totalPrice || 0;

  const totalItems =
    order.totalItems ||
    order.orderItems?.reduce(
      (total, item) =>
        total + (item.quantity || 0),
      0
    ) ||
    0;

  const orderStatus =
    order.orderStatus || "Pending";

  const paymentMethod =
    order.paymentMethod || "COD";

  const paymentStatus =
    order.paymentStatus || "Pending";

  return (
    <Box
      sx={{
        minHeight: "80vh",
        backgroundColor: "#f8fafc",
        py: {
          xs: 3,
          sm: 4,
          md: 6,
        },
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          px: {
            xs: 2,
            sm: 3,
          },
        }}
      >
        {/* ================= SUCCESS CARD ================= */}
        <Card
          sx={{
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            boxShadow: "none",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <CardContent
            sx={{
              textAlign: "center",
              px: {
                xs: 2,
                sm: 4,
              },
              py: {
                xs: 4,
                sm: 6,
              },
            }}
          >
            {/* SUCCESS ICON */}
            <Box
              sx={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2.5,
              }}
            >
              <CheckCircle
                sx={{
                  fontSize: 55,
                  color: "#16a34a",
                }}
              />
            </Box>

            {/* TITLE */}
            <Typography
              sx={{
                fontSize: {
                  xs: 28,
                  sm: 34,
                },
                fontWeight: 900,
                color: "#111827",
                letterSpacing: "-0.8px",
              }}
            >
              Order Placed Successfully!
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "#64748b",
                fontSize: 15,
                maxWidth: 500,
                mx: "auto",
              }}
            >
              Thank you for your order. Your books are now being
              processed.
            </Typography>

            {/* ================= ORDER ID ================= */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 3,
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Order ID
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: {
                    xs: 13,
                    sm: 15,
                  },
                  fontWeight: 900,
                  color: "#111827",
                  wordBreak: "break-all",
                }}
              >
                #{orderId}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* ================= ORDER INFO ================= */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, 1fr)",
                },
                gap: 2,
                textAlign: "left",
              }}
            >
              {/* STATUS */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Order Status
                </Typography>

                <Box
                  sx={{
                    display: "inline-flex",
                    mt: 0.8,
                    px: 1.2,
                    py: 0.5,
                    borderRadius: 1.5,
                    backgroundColor:
                      orderStatus === "Delivered"
                        ? "#dcfce7"
                        : orderStatus === "Cancelled"
                        ? "#fee2e2"
                        : orderStatus === "Shipped"
                        ? "#dbeafe"
                        : orderStatus === "Processing"
                        ? "#ede9fe"
                        : "#fef3c7",
                    color:
                      orderStatus === "Delivered"
                        ? "#166534"
                        : orderStatus === "Cancelled"
                        ? "#991b1b"
                        : orderStatus === "Shipped"
                        ? "#1d4ed8"
                        : orderStatus === "Processing"
                        ? "#6d28d9"
                        : "#92400e",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {orderStatus}
                </Box>
              </Box>

              {/* PAYMENT */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Payment
                </Typography>

                <Typography
                  sx={{
                    mt: 0.8,
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  {paymentMethod}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    fontSize: 12,
                    color:
                      paymentStatus === "Paid"
                        ? "#166534"
                        : "#92400e",
                    fontWeight: 700,
                  }}
                >
                  {paymentStatus}
                </Typography>
              </Box>

              {/* TOTAL ITEMS */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Items
                </Typography>

                <Typography
                  sx={{
                    mt: 0.8,
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  {totalItems}{" "}
                  {totalItems === 1
                    ? "Item"
                    : "Items"}
                </Typography>
              </Box>
            </Box>

            {/* ================= TOTAL ================= */}
            <Box
              sx={{
                mt: 2,
                p: 2.5,
                borderRadius: 3,
                backgroundColor: "#111827",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Order Total
              </Typography>

              <Typography
                sx={{
                  fontSize: {
                    xs: 21,
                    sm: 24,
                  },
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                ₹
                {totalPrice.toLocaleString(
                  "en-IN"
                )}
              </Typography>
            </Box>

            {/* ================= BUTTONS ================= */}
            <Box
              sx={{
                mt: 3,
                display: "flex",
                flexDirection: {
                  xs: "column",
                  sm: "row",
                },
                gap: 1.5,
                justifyContent: "center",
              }}
            >
              {/* VIEW ORDER */}
              <Button
                component={Link}
                to={`/orders/${orderId}`}
                variant="contained"
                endIcon={<ArrowForward />}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  backgroundColor: "#111827",
                  textTransform: "none",
                  fontWeight: 800,

                  "&:hover": {
                    backgroundColor: "#000000",
                  },
                }}
              >
                View Order Details
              </Button>

              {/* MY ORDERS */}
              <Button
                component={Link}
                to="/orders"
                variant="outlined"
                startIcon={<ReceiptLongOutlined />}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  borderColor: "#d1d5db",
                  color: "#111827",
                  textTransform: "none",
                  fontWeight: 800,

                  "&:hover": {
                    borderColor: "#111827",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                My Orders
              </Button>

              {/* CONTINUE SHOPPING */}
              <Button
                component={Link}
                to="/books"
                variant="outlined"
                startIcon={<ShoppingBagOutlined />}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  borderColor: "#d1d5db",
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 800,

                  "&:hover": {
                    borderColor: "#475569",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                Continue Shopping
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ================= EXTRA MESSAGE ================= */}
        <Typography
          sx={{
            mt: 2.5,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          You can track your order anytime from the My Orders
          section.
        </Typography>
      </Container>
    </Box>
  );
}

export default OrderSuccess;