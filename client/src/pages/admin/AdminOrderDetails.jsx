import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, Chip, Button, Divider,
  CircularProgress, Alert, Select, MenuItem, FormControl,
  InputLabel, TextField, Stepper, Step, StepLabel, StepConnector,
  Avatar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  LocalShipping, Inventory2, CheckCircle, Cancel, AccessTime,
  Route, Person, LocationOn, Payment, Timeline, Edit, Verified,
  Refresh,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = "https://bookstore-management-web-applications.onrender.com";

const OrderConnector = styled(StepConnector)(({ theme }) => ({
  "& .MuiStepConnector-line": {
    minHeight: 3,
    border: 0,
    backgroundColor: theme.palette.divider,
    borderRadius: 5,
  },
}));

function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const [qrCode, setQrCode] = useState("");
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");

  const [trackingForm, setTrackingForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDeliveryAt: "",
  });
  const [trackingUpdating, setTrackingUpdating] = useState(false);

  const [deliveryForm, setDeliveryForm] = useState({
    receivedBy: "",
    deliveryNote: "",
    verified: false,
  });
  const [deliveryUpdating, setDeliveryUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const formatDateTimeLocal = (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    if (!date) return "Not available";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Not available";
    return parsed.toLocaleString("en-IN");
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch order");
      }

      const currentOrder = data.order;
      setOrder(currentOrder);

      const tracking = currentOrder?.tracking || {};
      setTrackingForm({
        carrier: tracking.carrier || "",
        trackingNumber: tracking.trackingNumber || "",
        trackingUrl: tracking.trackingUrl || "",
        estimatedDeliveryAt: tracking.estimatedDeliveryAt
          ? formatDateTimeLocal(tracking.estimatedDeliveryAt)
          : "",
      });

      const delivery = currentOrder?.delivery || {};
      setDeliveryForm({
        receivedBy: delivery.receivedBy || "",
        deliveryNote: delivery.deliveryNote || "",
        verified: Boolean(delivery.verified),
      });
    } catch (err) {
      console.error("Fetch order error:", err);
      setError(err.message || "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      setQrLoading(true);
      setQrError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/orders/${id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate QR code");
      }

      setQrCode(data.qrCode || "");
    } catch (err) {
      console.error("QR generation error:", err);
      setQrError(err.message || "Failed to generate QR code");
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();
    fetchQRCode();
  }, [id]);

  const updateTracking = async () => {
    try {
      setTrackingUpdating(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/orders/${id}/tracking`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          carrier: trackingForm.carrier,
          trackingNumber: trackingForm.trackingNumber,
          trackingUrl: trackingForm.trackingUrl,
          estimatedDeliveryAt: trackingForm.estimatedDeliveryAt || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update tracking information"
        );
      }

      setOrder(data.order);
      alert("Tracking information updated successfully.");
    } catch (err) {
      console.error("Tracking update error:", err);
      setError(err.message || "Failed to update tracking information");
    } finally {
      setTrackingUpdating(false);
    }
  };

  const updateDelivery = async () => {
    try {
      setDeliveryUpdating(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/orders/${id}/delivery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deliveryForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update delivery information"
        );
      }

      setOrder(data.order);
      alert("Delivery information updated successfully.");
    } catch (err) {
      console.error("Delivery update error:", err);
      setError(err.message || "Failed to update delivery information");
    } finally {
      setDeliveryUpdating(false);
    }
  };

  const verifyDelivery = async () => {
    try {
      setDeliveryUpdating(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/orders/${id}/delivery/verify`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to verify delivery");
      }

      setOrder(data.order);
      setDeliveryForm((previous) => ({ ...previous, verified: true }));
      alert("Delivery verified successfully.");
    } catch (err) {
      console.error("Delivery verification error:", err);
      setError(err.message || "Failed to verify delivery");
    } finally {
      setDeliveryUpdating(false);
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `order-${order?._id || id}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "warning";
      case "Processing": return "info";
      case "Shipped": return "primary";
      case "Delivered": return "success";
      case "Cancelled": return "error";
      default: return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return <AccessTime />;
      case "Processing": return <Inventory2 />;
      case "Shipped": return <LocalShipping />;
      case "Delivered": return <CheckCircle />;
      case "Cancelled": return <Cancel />;
      default: return <Timeline />;
    }
  };

  const statusSteps = ["Pending", "Processing", "Shipped", "Delivered"];
  const activeStep =
    order?.orderStatus === "Cancelled"
      ? -1
      : statusSteps.indexOf(order?.orderStatus);

  if (loading) {
    return (
      <Box sx={{
        minHeight: "70vh", display: "flex", justifyContent: "center",
        alignItems: "center", flexDirection: "column", gap: 2,
      }}>
        <CircularProgress />
        <Typography color="text.secondary">
          Loading order intelligence...
        </Typography>
      </Box>
    );
  }

  if (error && !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/admin/orders")}>
            ← Back to Orders
          </Button>
          <Button variant="contained" onClick={() => window.print()}>
            🖨️ Print Invoice
          </Button>
        </Box>
      </Box>
    );
  }

  if (!order) return null;

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN")
    : "N/A";
  const invoiceItems = order.orderItems || [];

  return (
    <>
      <style>{`
        @media screen {
          .print-invoice { display: none !important; }
        }
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            margin: 0 !important; padding: 0 !important;
            background: white !important;
          }
          body * { visibility: hidden !important; }
          .print-invoice, .print-invoice * { visibility: visible !important; }
          .print-invoice {
            display: block !important; position: absolute !important;
            left: 0 !important; top: 0 !important; width: 100% !important;
            background: white !important; color: black !important;
            padding: 0 !important; margin: 0 !important;
            box-sizing: border-box !important;
          }
          .print-invoice table {
            width: 100% !important; border-collapse: collapse !important;
          }
          .print-invoice th, .print-invoice td {
            border: 1px solid #cccccc !important; padding: 8px !important;
            color: black !important;
          }
          .print-invoice th {
            background: #f2f2f2 !important; font-weight: 700 !important;
          }
          .print-invoice .no-print { display: none !important; }
          .print-invoice .invoice-section {
            break-inside: avoid; page-break-inside: avoid;
          }
        }
      `}</style>

      <Box
        className="admin-order-screen"
        sx={{
          width: "100%", minHeight: "100vh", p: { xs: 2, md: 3 },
          boxSizing: "border-box",
          background: "linear-gradient(180deg, rgba(25,118,210,0.04) 0%, rgba(255,255,255,0) 35%)",
        }}
      >
        <Box sx={{
          display: "flex", justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2, flexWrap: "wrap", mb: 3,
        }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{
              display: "flex", alignItems: "center", gap: 1,
            }}>
              <Route /> Order Intelligence
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Order ID: {order._id}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={() => {
              fetchOrder();
              fetchQRCode();
            }}>Refresh</Button>
            <Button variant="outlined" onClick={() => navigate("/admin/orders")}>
              ← Back to Orders
            </Button>
            <Button variant="contained" onClick={() => window.print()}>
              🖨️ Print Invoice
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Paper elevation={4} sx={{
          p: { xs: 2, md: 4 }, mb: 3, borderRadius: 4, overflow: "hidden",
          background: "linear-gradient(135deg, rgba(25,118,210,0.10), rgba(156,39,176,0.06))",
        }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{
                  width: 58, height: 58,
                  bgcolor: `${getStatusColor(order.orderStatus)}.main`,
                }}>
                  {getStatusIcon(order.orderStatus)}
                </Avatar>
                <Box>
                  <Typography color="text.secondary">Current Order Status</Typography>
                  <Typography variant="h5" fontWeight="bold">{order.orderStatus}</Typography>
                  <Chip label={order.orderStatus} color={getStatusColor(order.orderStatus)} size="small" sx={{ mt: 0.5 }} />
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              {order.orderStatus === "Cancelled" ? (
                <Alert severity="error">This order has been cancelled.</Alert>
              ) : (
                <Stepper activeStep={activeStep} alternativeLabel connector={<OrderConnector />}>
                  {statusSteps.map((status) => (
                    <Step key={status}>
                      <StepLabel StepIconComponent={() => (
                        <Avatar sx={{
                          width: 34, height: 34,
                          bgcolor: statusSteps.indexOf(status) <= activeStep
                            ? "primary.main" : "action.disabledBackground",
                          color: statusSteps.indexOf(status) <= activeStep
                            ? "white" : "text.secondary",
                        }}>
                          {getStatusIcon(status)}
                        </Avatar>
                      )}>{status}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            <Inventory2 sx={{ verticalAlign: "middle", mr: 1 }} />
            Order Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary">Order Date</Typography>
              <Typography fontWeight="bold">{orderDate}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary">Total Items</Typography>
              <Typography fontWeight="bold">{order.totalItems || order.orderItems?.length || 0}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary">Total Amount</Typography>
              <Typography fontWeight="bold" sx={{ fontSize: "1.2rem" }}>
                ₹{Number(order.totalPrice || 0).toLocaleString("en-IN")}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary">Current Status</Typography>
              <Chip label={order.orderStatus} color={getStatusColor(order.orderStatus)} sx={{ mt: 0.5 }} />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: "100%", borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <Person sx={{ verticalAlign: "middle", mr: 1 }} /> Customer Information
              </Typography>
              <Typography><strong>Name:</strong> {order.user?.name || "N/A"}</Typography>
              <Typography sx={{ mt: 1, overflowWrap: "anywhere" }}>
                <strong>Email:</strong> {order.user?.email || "N/A"}
              </Typography>
              <Typography sx={{ mt: 1, overflowWrap: "anywhere" }}>
                <strong>User ID:</strong> {order.user?._id || "N/A"}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: "100%", borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <LocationOn sx={{ verticalAlign: "middle", mr: 1 }} /> Shipping Address
              </Typography>
              {[
                ["Name", order.shippingAddress?.fullName],
                ["Phone", order.shippingAddress?.phone],
                ["Address", order.shippingAddress?.address],
                ["City", order.shippingAddress?.city],
                ["State", order.shippingAddress?.state],
                ["Postal Code", order.shippingAddress?.postalCode],
                ["Country", order.shippingAddress?.country || "India"],
              ].map(([label, value]) => (
                <Typography key={label} sx={{ mt: 1, overflowWrap: "anywhere" }}>
                  <strong>{label}:</strong> {value || "N/A"}
                </Typography>
              ))}
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            <Payment sx={{ verticalAlign: "middle", mr: 1 }} /> Payment Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary">Payment Method</Typography>
              <Typography fontWeight="bold">{order.paymentMethod || "N/A"}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary">Payment Status</Typography>
              <Chip label={order.paymentStatus || "Pending"} color={
                order.paymentStatus === "Paid" ? "success"
                  : order.paymentStatus === "Failed" ? "error"
                  : order.paymentStatus === "Refunded" ? "info" : "warning"
              } sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary">Paid At</Typography>
              <Typography fontWeight="bold">{order.paidAt ? formatDate(order.paidAt) : "Not Paid"}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* TRACKING INFORMATION */}
        <Paper elevation={4} sx={{
          p: { xs: 2, md: 3 }, mb: 3, borderRadius: 3,
          border: "1px solid", borderColor: "divider", minWidth: 0,
        }}>
          <Box sx={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 2, flexWrap: "wrap", mb: 3,
          }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{
                display: "flex", alignItems: "center", gap: 1,
              }}>
                <LocalShipping /> Tracking Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage carrier and shipment tracking details.
              </Typography>
            </Box>
            {order.tracking?.trackingNumber && (
              <Chip icon={<Route />} label={order.tracking.trackingNumber}
                color="primary" variant="outlined" sx={{ maxWidth: "100%" }} />
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Carrier" placeholder="e.g. Delhivery"
                value={trackingForm.carrier}
                onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Tracking Number" placeholder="e.g. DEL123456789"
                value={trackingForm.trackingNumber}
                onChange={(e) => setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Tracking URL" placeholder="https://..."
                value={trackingForm.trackingUrl}
                onChange={(e) => setTrackingForm({ ...trackingForm, trackingUrl: e.target.value })} />
            </Grid>
            {/* FIXED: Dynamic type switching prevents browser native placeholder collision */}
            <Grid item xs={12} sm={6} sx={{ minWidth: 0 }}>
              <TextField 
                fullWidth 
                type={trackingForm.estimatedDeliveryAt ? "datetime-local" : "text"}
                label="Estimated Delivery"
                placeholder="Select date & time"
                InputLabelProps={{ shrink: true }}
                onFocus={(e) => { e.target.type = "datetime-local"; }}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                value={trackingForm.estimatedDeliveryAt}
                onChange={(e) => setTrackingForm({
                  ...trackingForm, estimatedDeliveryAt: e.target.value,
                })} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ height: "100%", display: "flex", alignItems: "center" }}>
                <Button fullWidth variant="contained"
                  startIcon={trackingUpdating ? <CircularProgress size={18} color="inherit" /> : <Edit />}
                  disabled={trackingUpdating} onClick={updateTracking} sx={{ minHeight: 56 }}>
                  {trackingUpdating ? "Updating..." : "Save Tracking Information"}
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
              <Typography color="text.secondary">Carrier</Typography>
              <Typography fontWeight="bold" sx={{
                mt: 0.5, overflowWrap: "anywhere", lineHeight: 1.6,
              }}>
                {order.tracking?.carrier || "Not assigned"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
              <Typography color="text.secondary">Shipped At</Typography>
              <Typography fontWeight="bold" sx={{
                mt: 0.5, overflowWrap: "anywhere", lineHeight: 1.6,
                whiteSpace: "normal",
              }}>
                {formatDate(order.tracking?.shippedAt || order.shippedAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
              <Typography color="text.secondary">Estimated Delivery</Typography>
              <Typography fontWeight="bold" sx={{
                mt: 0.5, overflowWrap: "anywhere", lineHeight: 1.6,
                whiteSpace: "normal",
              }}>
                {formatDate(order.tracking?.estimatedDeliveryAt)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* DELIVERY INFORMATION */}
        <Paper elevation={4} sx={{
          p: { xs: 2, md: 3 }, mb: 3, borderRadius: 3,
          border: "1px solid", borderColor: "divider",
        }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              <CheckCircle sx={{ verticalAlign: "middle", mr: 1 }} /> Delivery Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Record receiver information and verify successful delivery.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Received By" placeholder="Customer / Receiver name"
                value={deliveryForm.receivedBy}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, receivedBy: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Delivery Note" placeholder="e.g. Delivered at front door"
                value={deliveryForm.deliveryNote}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryNote: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained"
                startIcon={deliveryUpdating ? <CircularProgress size={18} color="inherit" /> : <Edit />}
                disabled={deliveryUpdating} onClick={updateDelivery}>
                {deliveryUpdating ? "Updating..." : "Save Delivery Information"}
              </Button>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography color="text.secondary">Expected Date</Typography>
              <Typography fontWeight="bold" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                {formatDate(order.delivery?.expectedDate)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography color="text.secondary">Delivered Date</Typography>
              <Typography fontWeight="bold" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                {formatDate(order.delivery?.deliveredDate || order.deliveredAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography color="text.secondary">Verification</Typography>
              {order.delivery?.verified
                ? <Chip icon={<Verified />} label="Delivery Verified" color="success" sx={{ mt: 0.5 }} />
                : <Chip icon={<AccessTime />} label="Not Verified" color="warning" sx={{ mt: 0.5 }} />}
            </Grid>
          </Grid>
          {order.orderStatus === "Delivered" && !order.delivery?.verified && (
            <Box sx={{
              mt: 3, p: 2, borderRadius: 2,
              bgcolor: "success.50", border: "1px solid", borderColor: "success.200",
            }}>
              <Typography fontWeight="bold">Delivery verification required</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                This order is marked as delivered but has not yet been verified.
              </Typography>
              <Button variant="contained" color="success"
                startIcon={deliveryUpdating ? <CircularProgress size={18} color="inherit" /> : <Verified />}
                disabled={deliveryUpdating} onClick={verifyDelivery}>
                {deliveryUpdating ? "Verifying..." : "Verify Delivery"}
              </Button>
            </Box>
          )}
        </Paper>

        {/* ORDERED BOOKS */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            <Inventory2 sx={{ verticalAlign: "middle", mr: 1 }} /> Ordered Books
          </Typography>
          {invoiceItems.map((item, index) => (
            <Box key={item._id || index}>
              <Box sx={{
                display: "flex", justifyContent: "space-between",
                gap: 2, alignItems: "center", flexWrap: "wrap", py: 2,
              }}>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography fontWeight="bold">{item.book?.title || "Book unavailable"}</Typography>
                  <Typography color="text.secondary">Author: {item.book?.author || "N/A"}</Typography>
                </Box>
                <Typography>Qty: <strong>{item.quantity}</strong></Typography>
                <Typography>₹{Number(item.price || 0).toLocaleString("en-IN")}</Typography>
                <Typography fontWeight="bold">
                  ₹{Number((item.price || 0) * (item.quantity || 0)).toLocaleString("en-IN")}
                </Typography>
              </Box>
              {index < invoiceItems.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>

        {/* QR CODE */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3, textAlign: "center" }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            QR Order Identification
          </Typography>
          {qrLoading ? (
            <Box sx={{
              minHeight: 260, display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center", gap: 2,
            }}>
              <CircularProgress />
              <Typography color="text.secondary">Generating QR code...</Typography>
            </Box>
          ) : qrError ? (
            <Alert severity="error" sx={{ maxWidth: 500, mx: "auto" }}>{qrError}</Alert>
          ) : qrCode ? (
            <Box>
              <Box component="img" src={qrCode} alt="Order QR Code" sx={{
                width: 220, height: 220, display: "block", mx: "auto",
                border: "1px solid #ddd", borderRadius: 2, p: 1, bgcolor: "white",
              }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Scan this QR code to identify this order.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Order #{order._id.slice(-8).toUpperCase()}
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={downloadQR}>
                Download QR Code
              </Button>
            </Box>
          ) : null}
        </Paper>
      </Box>
    </>
  );
}

export default AdminOrderDetails;