
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentReturnOutlined from "@mui/icons-material/AssignmentReturnOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import RefreshOutlined from "@mui/icons-material/Refresh";
import CancelOutlined from "@mui/icons-material/CancelOutlined";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;
const RETURN_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

const RETURN_REASONS = [
  "Damaged item",
  "Wrong item received",
  "Item not as described",
  "Missing items",
  "Other",
];

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

  if (!deliveredAt) {
    return {
      eligible: false,
      deliveredAt: null,
      deadline: null,
      message: "The delivery date is not available. Please contact support.",
    };
  }

  const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_MS);
  const eligible = Date.now() <= deadline.getTime();

  return {
    eligible,
    deliveredAt,
    deadline,
    message: eligible
      ? "This order is eligible for a return."
      : "Return policy has expired.",
  };
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const readApiResponse = async (response) => {
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      response.status === 404
        ? "The requested API route was not found. Check your backend return route."
        : "The server returned an unexpected response. Check that your backend is running."
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "The request failed.");
  }

  return data;
};

const getBookId = (item) => {
  const book = item?.book || item?.product;
  return String(book?._id || book || item?.bookId || "");
};

const getBookTitle = (item) =>
  item?.book?.title ||
  item?.product?.title ||
  item?.title ||
  item?.name ||
  "Book";

function Returns() {
  const [searchParams] = useSearchParams();

  const orderIdFromUrl = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderIdFromUrl);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const loadData = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setError("Please log in to view and request returns.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const authHeaders = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      };

      const [ordersResponse, returnsResponse] = await Promise.all([
        fetch(`${API_BASE}/orders/my-orders`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE}/returns/my`, {
          headers: authHeaders,
        }),
      ]);

      const [ordersData, returnsData] = await Promise.all([
        readApiResponse(ordersResponse),
        readApiResponse(returnsResponse),
      ]);

      const fetchedOrders = Array.isArray(ordersData.orders)
        ? ordersData.orders
        : Array.isArray(ordersData.data)
          ? ordersData.data
          : [];

      const fetchedReturns = Array.isArray(returnsData.returnRequests)
        ? returnsData.returnRequests
        : Array.isArray(returnsData.returns)
          ? returnsData.returns
          : [];

      setOrders(fetchedOrders);
      setReturnRequests(fetchedReturns);

      const requestedOrderId = searchParams.get("orderId") || "";

      if (requestedOrderId) {
        const requestedOrder = fetchedOrders.find(
          (order) => order._id === requestedOrderId
        );

        if (requestedOrder) {
          setSelectedOrderId(requestedOrder._id);
        } else {
          setError(
            "The linked order could not be found in your orders. You can select another order below."
          );
          setSelectedOrderId((current) =>
            fetchedOrders.some((order) => order._id === current)
              ? current
              : ""
          );
        }
      } else {
        setSelectedOrderId((current) =>
          fetchedOrders.some((order) => order._id === current)
            ? current
            : ""
        );
      }
    } catch (err) {
      console.error("Returns page error:", err);
      setError(err.message || "Unable to load return information.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);


useEffect(() => {
  loadData();

  const handleFocus = () => {
    loadData();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      loadData();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  };
}, [loadData]);

  const deliveredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          String(order.orderStatus || order.status || "").toLowerCase() ===
          "delivered"
      ),
    [orders]
  );

  const selectedOrder = useMemo(
    () => deliveredOrders.find((order) => order._id === selectedOrderId),
    [deliveredOrders, selectedOrderId]
  );

  const selectedWindow = useMemo(
    () => getReturnWindow(selectedOrder),
    [selectedOrder]
  );

  const selectedOrderItems = selectedOrder?.orderItems || selectedOrder?.items || [];

  const selectedItem = selectedOrderItems.find(
    (item) => getBookId(item) === selectedBookId
  );

  const availableQuantity = selectedItem
    ? Math.max(0, Number(selectedItem.quantity || 0))
    : 0;

  const estimatedRefund =
    Number(selectedItem?.price || 0) * Number(quantity || 0);

  const resetForm = () => {
    setSelectedBookId("");
    setQuantity(1);
    setReason("");
    setDescription("");
  };

  const handleOrderChange = (event) => {
    setSelectedOrderId(event.target.value);
    resetForm();
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Please log in to request a return.");
      return;
    }

    if (!selectedOrder) {
      setError("Please select a delivered order.");
      return;
    }

    // Recheck the deadline at submission time.
    const currentWindow = getReturnWindow(selectedOrder);

    if (!currentWindow.eligible) {
      setError(currentWindow.message);
      return;
    }

    if (!selectedBookId || !selectedItem) {
      setError("Please select a book to return.");
      return;
    }

    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1 ||
      Number(quantity) > availableQuantity
    ) {
      setError("Select a valid return quantity.");
      return;
    }

    if (!reason) {
      setError("Please select a return reason.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/returns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          items: [
            {
              bookId: selectedBookId,
              quantity: Number(quantity),
            },
          ],
          reason,
          description: description.trim(),
        }),
      });

      const data = await readApiResponse(response);

      setSuccess(data.message || "Return request submitted successfully.");
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Create return request error:", err);
      setError(err.message || "Unable to submit your return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (returnId) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this return request?"
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setCancellingId(returnId);

    try {
      const response = await fetch(
        `${API_BASE}/returns/${returnId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await readApiResponse(response);

      setSuccess(data.message || "Return request cancelled.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to cancel this return request.");
    } finally {
      setCancellingId("");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please log in to access your returns.
        </Alert>
        <Button component={Link} to="/login" variant="contained">
          Log in
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "80vh", py: 5 }}>
      <Container maxWidth="md">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: "#111827" }}
            >
              Returns & Refunds
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 1 }}>
              Request a return within 5 days of delivery and track its progress.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={loadData}
          >
            Refresh
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
        Please submit your return request within 5 days of delivery. Returns are not accepted after the return policy expires.
        </Alert>
        <Card sx={{ borderRadius: 3, mb: 4, boxShadow: "none", border: "1px solid #e5e7eb" }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <AssignmentReturnOutlined color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Request a return
              </Typography>
            </Stack>

            {deliveredOrders.length === 0 ? (
              <Alert severity="info">
                You don't have any delivered orders to return. Once an order is
                marked Delivered, it will appear here.
              </Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <FormControl fullWidth>
                    <InputLabel id="return-order-label">Delivered order</InputLabel>
                    <Select
                      labelId="return-order-label"
                      label="Delivered order"
                      value={selectedOrderId}
                      onChange={handleOrderChange}
                    >
                      {deliveredOrders.map((order) => {
                        const window = getReturnWindow(order);
                        return (
                          <MenuItem key={order._id} value={order._id}>
                            Order #{order._id.slice(-8)} —{" "}
                            {window.eligible ? "Return available" : "Window expired"}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {selectedOrder && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography fontWeight={700}>
                        Order #{selectedOrder._id}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>
                        Delivered: {formatDate(selectedWindow.deliveredAt)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>
                        Return deadline: {formatDate(selectedWindow.deadline)}
                      </Typography>
                      <Alert
                        severity={selectedWindow.eligible ? "success" : "warning"}
                        sx={{ mt: 1.5 }}
                      >
                        {selectedWindow.message}
                      </Alert>
                    </Box>
                  )}

                  {selectedOrder && selectedWindow.eligible && (
                    <>
                      <FormControl fullWidth>
                        <InputLabel id="return-book-label">Book to return</InputLabel>
                        <Select
                          labelId="return-book-label"
                          label="Book to return"
                          value={selectedBookId}
                          onChange={(event) => {
                            setSelectedBookId(event.target.value);
                            setQuantity(1);
                          }}
                        >
                          {selectedOrderItems.map((item, index) => {
                            const id = getBookId(item);
                            return (
                              <MenuItem key={`${id}-${index}`} value={id}>
                                {getBookTitle(item)} — Qty: {item.quantity}
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>

                      {selectedItem && (
                        <TextField
                          label={`Quantity to return (1–${availableQuantity})`}
                          type="number"
                          fullWidth
                          value={quantity}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setQuantity(
                              Number.isFinite(next) && next >= 1
                                ? Math.min(next, availableQuantity)
                                : 1
                            );
                          }}
                          inputProps={{ min: 1, max: availableQuantity, step: 1 }}
                          helperText={`Estimated refund: ${formatMoney(estimatedRefund)}`}
                        />
                      )}

                      <FormControl fullWidth>
                        <InputLabel id="return-reason-label">Reason for return</InputLabel>
                        <Select
                          labelId="return-reason-label"
                          label="Reason for return"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                        >
                          {RETURN_REASONS.map((item) => (
                            <MenuItem key={item} value={item}>
                              {item}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label="Additional details (optional)"
                        placeholder="Tell us more about the issue..."
                        multiline
                        minRows={3}
                        fullWidth
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        inputProps={{ maxLength: 1000 }}
                        helperText={`${description.length}/1000 characters`}
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting || !selectedBookId || !reason}
                        startIcon={
                          submitting ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <AssignmentReturnOutlined />
                          )
                        }
                        sx={{
                          py: 1.3,
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 800,
                        }}
                      >
                        {submitting ? "Submitting..." : "Submit Return Request"}
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <HistoryOutlined color="primary" />
          <Typography variant="h6" fontWeight={800}>
            My Return Requests ({returnRequests.length})
          </Typography>
        </Stack>

        {returnRequests.length === 0 ? (
          <Card sx={{ borderRadius: 3, boxShadow: "none", border: "1px solid #e5e7eb" }}>
            <CardContent sx={{ textAlign: "center", py: 5 }}>
              <AssignmentReturnOutlined sx={{ fontSize: 42, color: "#94a3b8", mb: 1 }} />
              <Typography fontWeight={800}>No return requests yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Your submitted return requests and refund updates will appear here.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {returnRequests.map((request) => (
              <Card
                key={request._id}
                sx={{ borderRadius: 3, boxShadow: "none", border: "1px solid #e5e7eb" }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography fontWeight={800}>
                        Return #{String(request._id).slice(-8)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Order: #
                        {String(request.order?._id || request.order || "").slice(-8) || "N/A"}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        alignSelf: { xs: "flex-start", sm: "center" },
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 2,
                        backgroundColor:
                          request.status === "Rejected" || request.status === "Cancelled"
                            ? "#fee2e2"
                            : request.status === "Refunded" || request.status === "Completed"
                              ? "#dcfce7"
                              : "#fef3c7",
                        color:
                          request.status === "Rejected" || request.status === "Cancelled"
                            ? "#991b1b"
                            : request.status === "Refunded" || request.status === "Completed"
                              ? "#166534"
                              : "#92400e",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {request.status || "Requested"}
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1}>
                    {(request.items || []).map((item, index) => (
                      <Typography key={`${request._id}-${index}`} variant="body2">
                        {item.title || item.book?.title || "Book"} × {item.quantity}
                      </Typography>
                    ))}
                    <Typography variant="body2" color="text.secondary">
                      Reason: {request.reason || "Not specified"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requested: {formatDate(request.requestedAt || request.createdAt)}
                    </Typography>
                    <Typography fontWeight={800}>
                      Estimated refund: {formatMoney(request.refundAmount)}
                    </Typography>
                    {request.adminNote && (
                      <Alert severity="info">
                        Update from BookStore: {request.adminNote}
                      </Alert>
                    )}
                  </Stack>

                  {request.status === "Requested" && (
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={
                        cancellingId === request._id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <CancelOutlined />
                        )
                      }
                      disabled={cancellingId === request._id}
                      onClick={() => handleCancel(request._id)}
                      sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      Cancel request
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default Returns;
