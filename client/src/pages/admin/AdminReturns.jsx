
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Autorenew,
  CheckCircle,
  Close,
  Inventory2Outlined,
  LocalShippingOutlined,
  Search,
  VisibilityOutlined,
  Replay,
  ReceiptLongOutlined,
  CurrencyRupee,
} from "@mui/icons-material";

const API_BASE = "https://bookstore-management-web-applications.onrender.com/api/returns";

const STATUSES = [
  "Requested",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Item Received",
  "Refund Processing",
  "Refunded",
  "Completed",
  "Cancelled",
];

const NEXT_STATUSES = {
  Approved: ["Pickup Scheduled"],
  "Pickup Scheduled": ["Item Received"],
  "Item Received": ["Refund Processing"],
  "Refund Processing": ["Refunded"],
  Refunded: ["Completed"],
};

const statusColors = {
  Requested: "warning",
  Approved: "success",
  Rejected: "error",
  "Pickup Scheduled": "info",
  "Item Received": "info",
  "Refund Processing": "warning",
  Refunded: "success",
  Completed: "success",
  Cancelled: "default",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// Date grouping helpers use the user's local timezone.
const getLocalDateKey = (value) => {
  if (!value) return "unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDayOffset = (dateKey) => {
  if (dateKey === "unknown") return null;

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, day);

  return Math.round((target - today) / 86400000);
};

const getDateGroupTitle = (dateKey) => {
  const offset = getDayOffset(dateKey);

  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (offset === null) return "Date not available";

  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getReturnDateKey = (item) =>
  getLocalDateKey(item.requestedAt || item.createdAt);

// Today first, tomorrow second, then other dates newest first,
// and requests with invalid/missing dates last.
const compareReturnDates = (a, b) => {
  const aOffset = getDayOffset(getReturnDateKey(a));
  const bOffset = getDayOffset(getReturnDateKey(b));

  const priority = (offset) => {
    if (offset === 0) return 0;
    if (offset === 1) return 1;
    if (offset === null) return 3;
    return 2;
  };

  const priorityDifference = priority(aOffset) - priority(bOffset);

  if (priorityDifference !== 0) return priorityDifference;

  const aKey = getReturnDateKey(a);
  const bKey = getReturnDateKey(b);

  if (aKey === "unknown") return 1;
  if (bKey === "unknown") return -1;

  return bKey.localeCompare(aKey);
};

const getCustomerName = (user) =>
  user?.name || user?.fullName || "Customer";

const getOrderId = (order) =>
  order?._id ? String(order._id).slice(-8).toUpperCase() : "—";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in again to access admin returns.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const responseText = await response.text();

    throw new Error(
      responseText.startsWith("<")
        ? `Server returned a non-JSON response (${response.status}). Check the backend route.`
        : responseText || `Request failed (${response.status}).`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function StatCard({ title, value, icon, color = "#2563eb" }) {
  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={750}
              sx={{ mt: 1, overflowWrap: "anywhere" }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: 48,
              height: 48,
              borderRadius: 2.5,
              color,
              bgcolor: `${color}15`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReturns = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiRequest("/admin/all?limit=100");

      setReturns(
        Array.isArray(data.returnRequests) ? data.returnRequests : []
      );
    } catch (err) {
      setError(err.message || "Unable to load return requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const filteredReturns = useMemo(() => {
    const term = search.trim().toLowerCase();

    return returns.filter((item) => {
      const customer = getCustomerName(item.user).toLowerCase();
      const email = (item.user?.email || "").toLowerCase();
      const orderId = getOrderId(item.order).toLowerCase();
      const returnId = String(item._id || "").toLowerCase();
      const reason = (item.reason || "").toLowerCase();

      const matchesSearch =
        !term ||
        customer.includes(term) ||
        email.includes(term) ||
        orderId.includes(term) ||
        returnId.includes(term) ||
        reason.includes(term);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [returns, search, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const count = (status) =>
      returns.filter((item) => item.status === status).length;

    return {
      total: returns.length,
      requested: count("Requested"),
      inProgress: returns.filter((item) =>
        [
          "Approved",
          "Pickup Scheduled",
          "Item Received",
          "Refund Processing",
        ].includes(item.status)
      ).length,
      refunded: returns.filter((item) =>
        ["Refunded", "Completed"].includes(item.status)
      ).length,
    };
  }, [returns]);

  const openActionDialog = (item, type, nextStatus = "") => {
    setSelectedReturn(item);
    setAdminNote(item.adminNote || "");
    setActionDialog({ type, nextStatus });
    setNotice("");
    setError("");
  };

  const closeActionDialog = () => {
    if (submitting) return;

    setActionDialog(null);
    setSelectedReturn(null);
    setAdminNote("");
  };

  const submitAction = async () => {
    if (!selectedReturn?._id || !actionDialog) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const path =
        actionDialog.type === "review"
          ? `/${selectedReturn._id}/review`
          : `/${selectedReturn._id}/status`;

      const body = {
        status: actionDialog.nextStatus,
        adminNote: adminNote.trim(),
      };

      const data = await apiRequest(`/admin${path}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (data.returnRequest) {
        setReturns((current) =>
          current.map((item) =>
            item._id === data.returnRequest._id
              ? { ...item, ...data.returnRequest }
              : item
          )
        );
      }

      setNotice(data.message || "Return request updated successfully.");
      setActionDialog(null);
      setSelectedReturn(null);
      setAdminNote("");

      await loadReturns(true);
    } catch (err) {
      setError(err.message || "Unable to update return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (item) => {
    setSelectedReturn(item);
    setNotice("");
    setError("");
  };

  const closeDetails = () => {
    setSelectedReturn(null);
  };

  // Sort all filtered requests BEFORE pagination so a date group
  // cannot be split between separate pages.
  const sortedReturns = useMemo(
    () => [...filteredReturns].sort(compareReturnDates),
    [filteredReturns]
  );

  const visibleReturns = useMemo(
    () =>
      sortedReturns.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [sortedReturns, page, rowsPerPage]
  );

  const groupedReturns = useMemo(() => {
    const groups = new Map();

    visibleReturns.forEach((item) => {
      const dateKey = getReturnDateKey(item);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey).push(item);
    });

    return [...groups.entries()].map(([dateKey, items]) => ({
      dateKey,
      title: getDateGroupTitle(dateKey),
      items,
    }));
  }, [visibleReturns]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Return Management
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Review customer requests and manage return and refund progress.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            refreshing ? <CircularProgress size={17} /> : <Replay />
          }
          onClick={() => loadReturns(true)}
          disabled={loading || refreshing}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {notice && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Requests"
            value={stats.total}
            icon={<ReceiptLongOutlined />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Awaiting Review"
            value={stats.requested}
            icon={<Inventory2Outlined />}
            color="#d97706"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<LocalShippingOutlined />}
            color="#0284c7"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Refunded / Completed"
            value={stats.refunded}
            icon={<CurrencyRupee />}
            color="#16a34a"
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
          >
            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, order, return ID..."
              size="small"
              sx={{ width: { xs: "100%", md: 400 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", md: 220 } }}
            >
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                displayEmpty
              >
                <MenuItem value="All">All statuses</MenuItem>

                {STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ py: 9, textAlign: "center" }}>
            <CircularProgress />

            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Loading return requests...
            </Typography>
          </Box>
        ) : filteredReturns.length === 0 ? (
          <Box sx={{ py: 9, px: 2, textAlign: "center" }}>
            <Inventory2Outlined
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />

            <Typography variant="h6" fontWeight={700}>
              No return requests found
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {returns.length === 0
                ? "Customer return requests will appear here."
                : "Try changing your search or status filter."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell>Return / Order</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Refund Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requested On</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {groupedReturns.map((group) => (
                    <Fragment key={`date-${group.dateKey}`}>
                      <TableRow
                        sx={{
                          bgcolor: "action.hover",
                          "& td": { py: 1.5 },
                        }}
                      >
                        <TableCell colSpan={7}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={2}
                          >
                            <Typography fontWeight={800}>
                              {group.title}
                            </Typography>

                            <Chip
                              size="small"
                              label={`${group.items.length} ${
                                group.items.length === 1
                                  ? "request"
                                  : "requests"
                              }`}
                              variant="outlined"
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {group.items.map((item) => (
                        <TableRow
                          key={item._id}
                          hover
                          onClick={() => openDetails(item)}
                          sx={{
                            cursor: "pointer",
                            "& td": { py: 1.75 },
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight={700} variant="body2">
                              #{String(item._id).slice(-8).toUpperCase()}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Order #{getOrderId(item.order)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography fontWeight={600} variant="body2">
                              {getCustomerName(item.user)}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.user?.email || "No email"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {item.reason || "—"}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {(item.items || []).length} item type(s)
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography fontWeight={700}>
                              {formatCurrency(item.refundAmount)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={item.status || "Unknown"}
                              color={statusColors[item.status] || "default"}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(
                                item.requestedAt || item.createdAt
                              )}
                            </Typography>
                          </TableCell>

                          <TableCell
                            align="right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="flex-end"
                            >
                              <Tooltip title="View details">
                                <IconButton
                                  color="primary"
                                  onClick={() => openDetails(item)}
                                  size="small"
                                >
                                  <VisibilityOutlined />
                                </IconButton>
                              </Tooltip>

                              {item.status === "Requested" && (
                                <>
                                  <Tooltip title="Approve request">
                                    <IconButton
                                      color="success"
                                      size="small"
                                      onClick={() =>
                                        openActionDialog(
                                          item,
                                          "review",
                                          "Approved"
                                        )
                                      }
                                    >
                                      <CheckCircle />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title="Reject request">
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() =>
                                        openActionDialog(
                                          item,
                                          "review",
                                          "Rejected"
                                        )
                                      }
                                    >
                                      <Close />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}

                              {(NEXT_STATUSES[item.status] || []).length >
                                0 && (
                                <Tooltip title="Advance return status">
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      openActionDialog(
                                        item,
                                        "status",
                                        NEXT_STATUSES[item.status][0]
                                      )
                                    }
                                  >
                                    <Autorenew />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredReturns.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Return details dialog */}
      <Dialog
        open={Boolean(selectedReturn && !actionDialog)}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
      >
        {selectedReturn && (
          <>
            <DialogTitle sx={{ pr: 7 }}>
              Return Request Details

              <IconButton
                onClick={closeDetails}
                sx={{ position: "absolute", right: 12, top: 12 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Return ID
                  </Typography>

                  <Typography
                    fontWeight={700}
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {selectedReturn._id}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Customer
                    </Typography>

                    <Typography fontWeight={600}>
                      {getCustomerName(selectedReturn.user)}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {selectedReturn.user?.email || "—"}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Order ID
                    </Typography>

                    <Typography fontWeight={600}>
                      #{getOrderId(selectedReturn.order)}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {formatDate(selectedReturn.order?.createdAt)}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider />

                <Typography fontWeight={700}>
                  Items requested for return
                </Typography>

                {(selectedReturn.items || []).map((item, index) => (
                  <Paper
                    key={`${
                      item.book?._id || item.book || item.title
                    }-${index}`}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2 }}
                  >
                    <Typography fontWeight={600}>
                      {item.book?.title || item.title || "Book"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Quantity: {item.quantity} × {formatCurrency(item.price)}
                    </Typography>

                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Item total:{" "}
                      {formatCurrency(
                        Number(item.quantity || 0) *
                          Number(item.price || 0)
                      )}
                    </Typography>
                  </Paper>
                ))}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Return reason
                  </Typography>

                  <Typography>{selectedReturn.reason || "—"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Customer description
                  </Typography>

                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    {selectedReturn.description ||
                      "No additional description."}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Refund amount
                  </Typography>

                  <Typography variant="h6" fontWeight={800}>
                    {formatCurrency(selectedReturn.refundAmount)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current status
                  </Typography>

                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedReturn.status || "Unknown"}
                      color={
                        statusColors[selectedReturn.status] || "default"
                      }
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Admin note
                  </Typography>

                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    {selectedReturn.adminNote || "No admin note yet."}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Requested:{" "}
                  {formatDate(
                    selectedReturn.requestedAt || selectedReturn.createdAt
                  )}
                  {selectedReturn.reviewedAt
                    ? ` · Reviewed: ${formatDate(
                        selectedReturn.reviewedAt
                      )}`
                    : ""}
                  {selectedReturn.completedAt
                    ? ` · Completed: ${formatDate(
                        selectedReturn.completedAt
                      )}`
                    : ""}
                </Typography>

                {selectedReturn.status === "Requested" && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() =>
                        openActionDialog(
                          selectedReturn,
                          "review",
                          "Approved"
                        )
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<Close />}
                      onClick={() =>
                        openActionDialog(
                          selectedReturn,
                          "review",
                          "Rejected"
                        )
                      }
                    >
                      Reject
                    </Button>
                  </Stack>
                )}

                {(NEXT_STATUSES[selectedReturn.status] || []).length >
                  0 && (
                  <Button
                    variant="contained"
                    startIcon={<Autorenew />}
                    onClick={() =>
                      openActionDialog(
                        selectedReturn,
                        "status",
                        NEXT_STATUSES[selectedReturn.status][0]
                      )
                    }
                  >
                    Move to {NEXT_STATUSES[selectedReturn.status][0]}
                  </Button>
                )}
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button onClick={closeDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Approval, rejection and status update dialog */}
      <Dialog
        open={Boolean(actionDialog)}
        onClose={closeActionDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {actionDialog?.type === "review"
            ? `${actionDialog.nextStatus} Return`
            : "Update Return Status"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert
              severity={
                actionDialog?.nextStatus === "Rejected"
                  ? "warning"
                  : "info"
              }
            >
              {actionDialog?.type === "review"
                ? `You are about to ${actionDialog.nextStatus.toLowerCase()} this return request.`
                : `The return status will change to "${actionDialog?.nextStatus}".`}
            </Alert>

            <TextField
              label="Admin note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Add a reason or update for the customer..."
              multiline
              minRows={3}
              inputProps={{ maxLength: 1000 }}
              helperText={`${adminNote.length}/1000 characters`}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeActionDialog} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color={
              actionDialog?.nextStatus === "Rejected" ? "error" : "primary"
            }
            onClick={submitAction}
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminReturns;
