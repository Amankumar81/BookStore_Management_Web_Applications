import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Stack,
} from "@mui/material";

import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ImageIcon from "@mui/icons-material/Image";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InventoryIcon from "@mui/icons-material/Inventory";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PaymentIcon from "@mui/icons-material/Payment";

import { Html5Qrcode } from "html5-qrcode";

const API_URL = "https://bookstore-management-web-applications.onrender.com";

const QRScanner = () => {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const scannerRunningRef = useRef(false);
  const fileInputRef = useRef(null);
  const scanHandledRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [order, setOrder] = useState(null);

  // =========================================================
  // STOP SCANNER
  // =========================================================

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setCameraActive(false);
      return;
    }

    try {
      if (scannerRunningRef.current) {
        scannerRunningRef.current = false;
        await scanner.stop();
      }
    } catch (err) {
      console.log("Scanner stop:", err);
    }

    try {
      await scanner.clear();
    } catch (err) {
      console.log("Scanner clear:", err);
    }

    scannerRef.current = null;
    setCameraActive(false);
  };

  // =========================================================
  // VALIDATE MONGODB OBJECT ID
  // =========================================================

  const isValidOrderId = (value) => {
    if (!value) return false;

    return /^[0-9a-fA-F]{24}$/.test(value.trim());
  };

  // =========================================================
  // EXTRACT ORDER ID FROM QR VALUE
  // =========================================================

  const extractOrderId = (value) => {
    if (!value) {
      return "";
    }

    const trimmedValue = value.trim();

    // QR contains only MongoDB ObjectId
    if (isValidOrderId(trimmedValue)) {
      return trimmedValue;
    }

    // QR contains URL or other text containing ObjectId
    const match = trimmedValue.match(/[0-9a-fA-F]{24}/);

    if (match) {
      return match[0];
    }

    return trimmedValue;
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    try {
      return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (err) {
      return "N/A";
    }
  };

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  // =========================================================
  // STATUS COLOR
  // =========================================================

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

  // =========================================================
  // PAYMENT STATUS COLOR
  // =========================================================

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "success";

      case "Failed":
        return "error";

      case "Refunded":
        return "info";

      case "Pending":
      default:
        return "warning";
    }
  };

  // =========================================================
  // FETCH ORDER
  // =========================================================

  const fetchOrder = async (qrValue) => {
    try {
      const orderId = extractOrderId(qrValue);

      console.log("QR VALUE:", qrValue);
      console.log("EXTRACTED ORDER ID:", orderId);

      if (!isValidOrderId(orderId)) {
        setOrder(null);
        setError(
          "Invalid Order QR code. Please scan a valid bookstore order QR."
        );
        return;
      }

      setOrderLoading(true);
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let data;

      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response received from server.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Order not found.");
      }

      if (!data.order) {
        throw new Error(
          "Order data was not returned by server."
        );
      }

      setOrder(data.order);

      setMessage(
        "Order QR scanned successfully! Opening order details..."
      );

      console.log("ORDER FOUND:", data.order);

      // Automatically open full admin order details
      setTimeout(() => {
        navigate(`/admin/orders/${data.order._id}`);
      }, 700);
    } catch (err) {
      console.error("FETCH ORDER ERROR:", err);

      setOrder(null);

      setError(
        err.message || "Unable to load order."
      );
    } finally {
      setOrderLoading(false);
    }
  };

  // =========================================================
  // QR SCAN SUCCESS
  // =========================================================

  const handleScanSuccess = async (decodedText) => {
    if (scanHandledRef.current) {
      return;
    }

    scanHandledRef.current = true;

    console.log("QR SCANNED:", decodedText);

    await stopScanner();

    await fetchOrder(decodedText);
  };

  // =========================================================
  // START CAMERA
  // =========================================================

  const startCamera = async () => {
    try {
      setError("");
      setMessage("");
      setOrder(null);

      setLoading(true);
      scanHandledRef.current = false;

      await stopScanner();

      const scanner = new Html5Qrcode("qr-reader");

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
          aspectRatio: 1,
        },
        handleScanSuccess,
        () => {}
      );

      scannerRunningRef.current = true;
      setCameraActive(true);

      setMessage(
        "Camera is active. Point it at the order QR code."
      );
    } catch (err) {
      console.error("CAMERA ERROR:", err);

      scannerRunningRef.current = false;
      scannerRef.current = null;

      setCameraActive(false);

      setError(
        "Unable to access camera. Please allow camera permission and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SELECT QR IMAGE
  // =========================================================

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setOrder(null);

      setLoading(true);
      scanHandledRef.current = false;

      await stopScanner();

      const scanner = new Html5Qrcode("qr-reader-file");

      const decodedText = await scanner.scanFile(
        file,
        false
      );

      try {
        await scanner.clear();
      } catch (err) {
        console.log("File scanner clear:", err);
      }

      console.log("IMAGE QR:", decodedText);

      await fetchOrder(decodedText);
    } catch (err) {
      console.error("IMAGE QR ERROR:", err);

      setError(
        "No valid QR code found in this image."
      );
    } finally {
      setLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

  const updateStatus = async (newStatus) => {
    if (!order) {
      return;
    }

    const currentStatus = order.orderStatus;

    // Frontend protection matching backend order flow
    const validTransitions = {
      Pending: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"],
      Delivered: [],
      Cancelled: [],
    };

    if (
      !validTransitions[currentStatus]?.includes(newStatus)
    ) {
      setError(
        `Order cannot be changed from ${currentStatus} to ${newStatus}.`
      );

      return;
    }

    try {
      setOrderLoading(true);
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/orders/${order._id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderStatus: newStatus,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(
          "Invalid response received from server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update order status."
        );
      }

      if (!data.order) {
        throw new Error(
          "Updated order data was not returned by server."
        );
      }

      setOrder(data.order);

      setMessage(
        `Order status changed to ${newStatus}.`
      );
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);

      setError(
        err.message ||
          "Failed to update order status."
      );
    } finally {
      setOrderLoading(false);
    }
  };

  // =========================================================
  // CANCEL ORDER
  // =========================================================

  const cancelOrder = async () => {
    if (!order) {
      return;
    }

    if (
      order.orderStatus !== "Pending" &&
      order.orderStatus !== "Processing"
    ) {
      setError(
        `Order cannot be cancelled because it is already ${order.orderStatus}.`
      );

      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) {
      return;
    }

    // Use admin status endpoint so QR scanner works
    // with the admin order workflow.
    await updateStatus("Cancelled");
  };

  // =========================================================
  // COPY ORDER ID
  // =========================================================

  const copyOrderId = async () => {
    if (!order?._id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(order._id);

      setMessage(
        "Order ID copied to clipboard."
      );
    } catch (err) {
      console.error("COPY ERROR:", err);

      setError(
        "Unable to copy Order ID."
      );
    }
  };

  // =========================================================
  // RESET SCANNER
  // =========================================================

  const resetScanner = async () => {
    await stopScanner();

    setOrder(null);
    setMessage("");
    setError("");

    setLoading(false);
    setOrderLoading(false);

    scanHandledRef.current = false;
  };

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      const cleanupScanner = async () => {
        const scanner = scannerRef.current;

        if (!scanner) {
          return;
        }

        try {
          if (scannerRunningRef.current) {
            scannerRunningRef.current = false;
            await scanner.stop();
          }
        } catch (err) {
          console.log("Scanner cleanup stop:", err);
        }

        try {
          await scanner.clear();
        } catch (err) {
          console.log("Scanner cleanup clear:", err);
        }

        scannerRef.current = null;
      };

      cleanupScanner();
    };
  }, []);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background:
          "linear-gradient(135deg, #f5f7fb 0%, #eef2ff 100%)",
        p: {
          xs: 2,
          md: 4,
        },
      }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          mb: 4,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/orders")}
          sx={{ mb: 2 }}
        >
          Back to Orders
        </Button>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: {
              xs: "flex-start",
              md: "center",
            },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <QrCodeScannerIcon fontSize="large" />

              Order QR Scanner
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Scan an order QR and manage the order directly.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={resetScanner}
          >
            Reset Scanner
          </Button>
        </Box>
      </Box>

      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}

      <Paper
        elevation={5}
        sx={{
          maxWidth: 1100,
          mx: "auto",
          p: {
            xs: 2,
            md: 4,
          },
          borderRadius: 4,
        }}
      >
        {/* ===================================================
            CAMERA + IMAGE SCANNER
        ==================================================== */}

        <Grid
          container
          spacing={3}
        >
          {/* CAMERA CARD */}

          <Grid
            item
            xs={12}
            md={6}
          >
            <Card
              elevation={3}
              sx={{
                height: "100%",
                borderRadius: 4,
                border: cameraActive
                  ? "2px solid"
                  : "1px solid",
                borderColor: cameraActive
                  ? "primary.main"
                  : "divider",
              }}
            >
              <CardContent
                sx={{
                  p: 4,
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    mx: "auto",
                    mb: 2,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "rgba(25,118,210,0.1)",
                  }}
                >
                  <CameraAltIcon
                    sx={{
                      fontSize: 45,
                      color: "primary.main",
                    }}
                  />
                </Box>

                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Camera Scanner
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    mb: 3,
                  }}
                >
                  Scan an order QR using your device camera.
                </Typography>

                {!cameraActive ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<CameraAltIcon />}
                    onClick={startCamera}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    {loading
                      ? "Starting Camera..."
                      : "Open Camera"}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    size="large"
                    startIcon={<StopCircleIcon />}
                    onClick={stopScanner}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    Stop Camera
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* IMAGE CARD */}

          <Grid
            item
            xs={12}
            md={6}
          >
            <Card
              elevation={3}
              sx={{
                height: "100%",
                borderRadius: 4,
              }}
            >
              <CardContent
                sx={{
                  p: 4,
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    mx: "auto",
                    mb: 2,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "rgba(156,39,176,0.1)",
                  }}
                >
                  <ImageIcon
                    sx={{
                      fontSize: 45,
                      color: "secondary.main",
                    }}
                  />
                </Box>

                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Upload QR Image
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    mb: 3,
                  }}
                >
                  Select a saved QR image from your computer.
                </Typography>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileSelect}
                />

                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  size="large"
                  startIcon={<UploadFileIcon />}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                  }}
                >
                  Select QR Image
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ===================================================
            CAMERA VIEW
        ==================================================== */}

        {cameraActive && (
          <>
            <Divider sx={{ my: 4 }} />

            <Box sx={{ textAlign: "center" }}>
              <Chip
                icon={<CameraAltIcon />}
                label="Camera Active"
                color="success"
                sx={{
                  mb: 2,
                  fontWeight: "bold",
                }}
              />

              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ mb: 2 }}
              >
                Point camera at QR
              </Typography>

              <Box
                sx={{
                  maxWidth: 500,
                  mx: "auto",
                  background: "#000",
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "4px solid #1976d2",
                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.2)",
                }}
              >
                <Box id="qr-reader" />
              </Box>
            </Box>
          </>
        )}

        {/* Hidden image scanner container */}

        <Box
          id="qr-reader-file"
          sx={{
            display: "none",
          }}
        />

        {/* ===================================================
            LOADING
        ==================================================== */}

        {loading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />

            <Typography
              textAlign="center"
              sx={{ mt: 1 }}
            >
              Processing QR code...
            </Typography>
          </Box>
        )}

        {orderLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              my: 3,
            }}
          >
            <CircularProgress size={25} />

            <Typography>
              Processing order...
            </Typography>
          </Box>
        )}

        {/* ===================================================
            MESSAGES
        ==================================================== */}

        {message && (
          <Alert
            severity="success"
            sx={{ mt: 3 }}
          >
            {message}
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* ===================================================
            QR ORDER ACTION PANEL
        ==================================================== */}

        {order && (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 4 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: {
                  xs: "flex-start",
                  md: "center",
                },
                gap: 2,
                flexWrap: "wrap",
                mb: 3,
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <QrCodeScannerIcon />

                  QR Order Action Panel
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Order identified successfully.
                </Typography>
              </Box>

              <Chip
                label={order.orderStatus || "Unknown"}
                color={getStatusColor(
                  order.orderStatus
                )}
                sx={{
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  px: 1,
                }}
              />
            </Box>

            {/* ORDER ID */}

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                background:
                  "rgba(25,118,210,0.04)",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Order ID
              </Typography>

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1}
                alignItems={{
                  xs: "stretch",
                  sm: "center",
                }}
                sx={{ mt: 0.5 }}
              >
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    wordBreak: "break-all",
                  }}
                >
                  {order._id}
                </Typography>

                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={copyOrderId}
                >
                  Copy
                </Button>
              </Stack>
            </Paper>

            {/* ORDER SUMMARY */}

            <Grid
              container
              spacing={2}
            >
              {/* CUSTOMER */}

              <Grid
                item
                xs={12}
                md={6}
              >
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ mb: 2 }}
                    >
                      Customer
                    </Typography>

                    <Typography fontWeight="bold">
                      {order.user?.name ||
                        order.shippingAddress?.fullName ||
                        "N/A"}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {order.user?.email || "N/A"}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {order.shippingAddress?.phone ||
                        "N/A"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* ORDER INFO */}

              <Grid
                item
                xs={12}
                md={6}
              >
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ mb: 2 }}
                    >
                      Order Summary
                    </Typography>

                    <Typography>
                      Total Items:{" "}
                      <strong>
                        {order.totalItems || 0}
                      </strong>
                    </Typography>

                    <Typography sx={{ mt: 1 }}>
                      Total Amount:{" "}
                      <strong>
                        {formatCurrency(
                          order.totalPrice
                        )}
                      </strong>
                    </Typography>

                    <Typography
                      sx={{ mt: 1 }}
                    >
                      Ordered:{" "}
                      <strong>
                        {formatDate(
                          order.createdAt
                        )}
                      </strong>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* PAYMENT */}

              <Grid
                item
                xs={12}
                md={6}
              >
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <PaymentIcon />

                      Payment
                    </Typography>

                    <Typography>
                      Method:{" "}
                      <strong>
                        {order.paymentMethod ||
                          "N/A"}
                      </strong>
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      <Chip
                        size="small"
                        label={
                          order.paymentStatus ||
                          "Pending"
                        }
                        color={getPaymentStatusColor(
                          order.paymentStatus
                        )}
                      />
                    </Box>

                    {order.paidAt && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Paid:{" "}
                        {formatDate(
                          order.paidAt
                        )}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* TRACKING */}

              <Grid
                item
                xs={12}
                md={6}
              >
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <LocalShippingIcon />

                      Tracking
                    </Typography>

                    <Typography>
                      Carrier:{" "}
                      <strong>
                        {order.tracking?.carrier ||
                          "Not assigned"}
                      </strong>
                    </Typography>

                    <Typography
                      sx={{ mt: 1 }}
                    >
                      Tracking Number:{" "}
                      <strong>
                        {order.tracking
                          ?.trackingNumber ||
                          "Not assigned"}
                      </strong>
                    </Typography>

                    {order.tracking
                      ?.estimatedDeliveryAt && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Estimated Delivery:{" "}
                        {formatDate(
                          order.tracking
                            .estimatedDeliveryAt
                        )}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* =================================================
                QUICK STATUS ACTIONS
            ================================================== */}

            <Card
              elevation={2}
              sx={{
                mt: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <InventoryIcon />

                  Quick Order Actions
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Update the order directly from the QR scanner.
                </Typography>

                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={2}
                  flexWrap="wrap"
                >
                  {order.orderStatus === "Pending" && (
                    <Button
                      variant="contained"
                      color="info"
                      startIcon={<InventoryIcon />}
                      onClick={() =>
                        updateStatus("Processing")
                      }
                      disabled={orderLoading}
                    >
                      Mark Processing
                    </Button>
                  )}

                  {order.orderStatus === "Processing" && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={
                        <LocalShippingIcon />
                      }
                      onClick={() =>
                        updateStatus("Shipped")
                      }
                      disabled={orderLoading}
                    >
                      Mark Shipped
                    </Button>
                  )}

                  {order.orderStatus === "Shipped" && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={
                        <CheckCircleIcon />
                      }
                      onClick={() =>
                        updateStatus("Delivered")
                      }
                      disabled={orderLoading}
                    >
                      Mark Delivered
                    </Button>
                  )}

                  {(order.orderStatus === "Pending" ||
                    order.orderStatus ===
                      "Processing") && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={cancelOrder}
                      disabled={orderLoading}
                    >
                      Cancel Order
                    </Button>
                  )}

                  {order.orderStatus === "Delivered" && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Order Delivered"
                      color="success"
                    />
                  )}

                  {order.orderStatus === "Cancelled" && (
                    <Chip
                      icon={<CancelIcon />}
                      label="Order Cancelled"
                      color="error"
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* =================================================
                SHIPPING ADDRESS
            ================================================== */}

            {order.shippingAddress && (
              <Card
                variant="outlined"
                sx={{
                  mt: 3,
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                  >
                    Shipping Address
                  </Typography>

                  <Typography fontWeight="bold">
                    {order.shippingAddress.fullName}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {order.shippingAddress.address}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {order.shippingAddress.city},{" "}
                    {order.shippingAddress.state}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {order.shippingAddress.postalCode},{" "}
                    {order.shippingAddress.country}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Phone:{" "}
                    {order.shippingAddress.phone}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* =================================================
                ORDERED BOOKS
            ================================================== */}

            <Card
              variant="outlined"
              sx={{
                mt: 3,
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 3,
                  }}
                >
                  <InventoryIcon />

                  Ordered Books
                </Typography>

                <Stack spacing={2}>
                  {order.orderItems?.map(
                    (item, index) => (
                      <Paper
                        key={
                          item._id ||
                          item.book?._id ||
                          index
                        }
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: {
                              xs: "flex-start",
                              sm: "center",
                            },
                            gap: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          <Box>
                            <Typography
                              fontWeight="bold"
                            >
                              {item.book?.title ||
                                "Book"}
                            </Typography>

                            {item.book?.author && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                By{" "}
                                {item.book.author}
                              </Typography>
                            )}
                          </Box>

                          <Box
                            sx={{
                              textAlign: {
                                xs: "left",
                                sm: "right",
                              },
                            }}
                          >
                            <Typography>
                              Qty:{" "}
                              <strong>
                                {item.quantity}
                              </strong>
                            </Typography>

                            <Typography
                              fontWeight="bold"
                            >
                              {formatCurrency(
                                item.price *
                                  item.quantity
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    )
                  )}
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                  >
                    Grand Total
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary"
                  >
                    {formatCurrency(
                      order.totalPrice
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* =================================================
                DELIVERY INFORMATION
            ================================================== */}

            <Card
              variant="outlined"
              sx={{
                mt: 3,
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <CheckCircleIcon />

                  Delivery Information
                </Typography>

                <Grid
                  container
                  spacing={2}
                >
                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Expected Delivery
                    </Typography>

                    <Typography fontWeight="bold">
                      {formatDate(
                        order.delivery
                          ?.expectedDate ||
                          order.tracking
                            ?.estimatedDeliveryAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Delivered Date
                    </Typography>

                    <Typography fontWeight="bold">
                      {formatDate(
                        order.delivery
                          ?.deliveredDate ||
                          order.deliveredAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Received By
                    </Typography>

                    <Typography fontWeight="bold">
                      {order.delivery?.receivedBy ||
                        "Not recorded"}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Verification
                    </Typography>

                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        size="small"
                        icon={
                          order.delivery?.verified ? (
                            <CheckCircleIcon />
                          ) : (
                            <AccessTimeIcon />
                          )
                        }
                        label={
                          order.delivery?.verified
                            ? "Verified"
                            : "Not Verified"
                        }
                        color={
                          order.delivery?.verified
                            ? "success"
                            : "warning"
                        }
                      />
                    </Box>
                  </Grid>

                  {order.delivery?.deliveryNote && (
                    <Grid
                      item
                      xs={12}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Delivery Note
                      </Typography>

                      <Typography>
                        {order.delivery.deliveryNote}
                      </Typography>
                    </Grid>
                  )}

                  {order.delivery?.verifiedAt && (
                    <Grid
                      item
                      xs={12}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Verified At
                      </Typography>

                      <Typography>
                        {formatDate(
                          order.delivery.verifiedAt
                        )}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* =================================================
                STATUS TIMELINE
            ================================================== */}

            {order.statusHistory?.length > 0 && (
              <Card
                variant="outlined"
                sx={{
                  mt: 3,
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 3,
                    }}
                  >
                    <AccessTimeIcon />

                    Order Status Timeline
                  </Typography>

                  <Stack spacing={2}>
                    {[...order.statusHistory]
                      .reverse()
                      .map((history, index) => (
                        <Box
                          key={
                            history._id ||
                            `${history.status}-${index}`
                          }
                          sx={{
                            display: "flex",
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius:
                                "50%",
                              backgroundColor:
                                history.status ===
                                "Delivered"
                                  ? "success.main"
                                  : history.status ===
                                    "Cancelled"
                                  ? "error.main"
                                  : "primary.main",
                              mt: 0.7,
                              flexShrink: 0,
                            }}
                          />

                          <Box>
                            <Typography
                              fontWeight="bold"
                            >
                              {history.status}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {formatDate(
                                history.changedAt
                              )}
                            </Typography>

                            {history.note && (
                              <Typography
                                variant="body2"
                                sx={{ mt: 0.5 }}
                              >
                                {history.note}
                              </Typography>
                            )}

                            {history.updatedBy && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Updated by:{" "}
                                {history.updatedBy
                                  .name ||
                                  history.updatedBy
                                    .email ||
                                  "Admin"}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* =================================================
                TIMESTAMPS
            ================================================== */}

            <Card
              variant="outlined"
              sx={{
                mt: 3,
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ mb: 2 }}
                >
                  Order Processing Information
                </Typography>

                <Grid
                  container
                  spacing={2}
                >
                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Created
                    </Typography>

                    <Typography>
                      {formatDate(
                        order.createdAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Processed
                    </Typography>

                    <Typography>
                      {formatDate(
                        order.processedAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Shipped
                    </Typography>

                    <Typography>
                      {formatDate(
                        order.shippedAt ||
                          order.tracking
                            ?.shippedAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Delivered
                    </Typography>

                    <Typography>
                      {formatDate(
                        order.deliveredAt ||
                          order.tracking
                            ?.deliveredAt
                      )}
                    </Typography>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Cancelled
                    </Typography>

                    <Typography>
                      {formatDate(
                        order.cancelledAt
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* =================================================
                BOTTOM ACTIONS
            ================================================== */}

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
              sx={{ mt: 4 }}
            >
              <Button
                fullWidth
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={() =>
                  navigate(
                    `/admin/orders/${order._id}`
                  )
                }
              >
                Full Order Details
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={resetScanner}
              >
                Scan Another Order
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default QRScanner;