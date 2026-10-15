
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
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
  Block,
  CheckCircle,
  ContentCopy,
  Delete,
  Download,
  Email,
  FilterAltOff,
  People,
  Refresh,
  Search,
  ShoppingBag,
  Sort,
  Visibility,
} from "@mui/icons-material";

import { toast } from "react-toastify";

const API_URL = "http://localhost:5000";

const INITIAL_PAGINATION = {
  currentPage: 1,
  totalPages: 0,
  totalCustomers: 0,
  limit: 10,
};

const readResponse = async (response) => {
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid server response. Check your backend.");
    }
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        data.errors?.[0] ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getInitials = (name) => {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getCustomerId = (customer) => String(customer?._id || "");

const getErrorMessage = (error, fallback) =>
  error?.message || fallback;

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [customerToBlock, setCustomerToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getAuthHeaders = useCallback((includeJson = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Authentication token missing. Please log in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
    };
  }, []);

  const fetchCustomers = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams({
          search: search.trim(),
          status,
          page: String(page + 1),
          limit: String(rowsPerPage),
          sortBy,
        });

        const response = await fetch(
          `${API_URL}/api/user/customers?${params.toString()}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );

        const data = await readResponse(response);
        const nextCustomers = Array.isArray(data.customers)
          ? data.customers
          : [];

        setCustomers(nextCustomers);

        const nextPagination = {
          ...INITIAL_PAGINATION,
          ...(data.pagination || {}),
          currentPage: data.pagination?.currentPage ?? page + 1,
          limit: data.pagination?.limit ?? rowsPerPage,
        };

        setPagination(nextPagination);

        if (
          nextPagination.totalPages > 0 &&
          page + 1 > nextPagination.totalPages
        ) {
          setPage(nextPagination.totalPages - 1);
        } else if (nextPagination.totalPages === 0 && page !== 0) {
          setPage(0);
        }
      } catch (err) {
        console.error("FETCH CUSTOMERS ERROR:", err);
        setError(getErrorMessage(err, "Failed to fetch customers."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, sortBy, page, rowsPerPage, getAuthHeaders]
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 350);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setSortBy("newest");
    setPage(0);
  };

  const handleViewCustomer = async (customerId) => {
    if (!customerId) return;

    try {
      setDetailsLoading(true);
      setDetailsOpen(true);
      setSelectedCustomer(null);
      setCustomerOrders([]);

      const response = await fetch(
        `${API_URL}/api/user/customers/${customerId}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await readResponse(response);

      setSelectedCustomer(data.customer || null);
      setCustomerOrders(
        Array.isArray(data.recentOrders) ? data.recentOrders : []
      );
    } catch (err) {
      console.error("CUSTOMER DETAILS ERROR:", err);
      toast.error(getErrorMessage(err, "Failed to load customer details."));
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openBlockDialog = (customer) => {
    setCustomerToBlock(customer);
    setBlockReason(customer.blockedReason || "");
    setBlockDialogOpen(true);
  };

  const closeBlockDialog = () => {
    if (actionLoading) return;

    setBlockDialogOpen(false);
    setCustomerToBlock(null);
    setBlockReason("");
  };

  const handleBlockCustomer = async () => {
    if (!customerToBlock) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${API_URL}/api/user/customers/${customerToBlock._id}/block`,
        {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ reason: blockReason.trim() }),
        }
      );

      await readResponse(response);

      toast.success("Customer blocked successfully.");
      setBlockDialogOpen(false);
      setCustomerToBlock(null);
      setBlockReason("");

      await fetchCustomers(true);
    } catch (err) {
      console.error("BLOCK CUSTOMER ERROR:", err);
      toast.error(getErrorMessage(err, "Failed to block customer."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockCustomer = async (customer) => {
    try {
      setActionLoading(true);

      const response = await fetch(
        `${API_URL}/api/user/customers/${customer._id}/unblock`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      await readResponse(response);

      toast.success("Customer unblocked successfully.");
      await fetchCustomers(true);
    } catch (err) {
      console.error("UNBLOCK CUSTOMER ERROR:", err);
      toast.error(getErrorMessage(err, "Failed to unblock customer."));
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (actionLoading) return;

    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${API_URL}/api/user/customers/${customerToDelete._id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      await readResponse(response);

      toast.success("Customer deleted successfully.");
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);

      await fetchCustomers(true);
    } catch (err) {
      console.error("DELETE CUSTOMER ERROR:", err);
      toast.error(getErrorMessage(err, "Failed to delete customer."));
    } finally {
      setActionLoading(false);
    }
  };

  const copyCustomerId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Customer ID copied.");
    } catch {
      toast.error("Unable to copy ID. Please copy it manually.");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Total Orders",
      "Total Spent",
      "Joined Date",
    ];

    const rows = displayedCustomers.map((customer) => [
      getCustomerId(customer),
      customer.name || "",
      customer.email || "",
      customer.phone || "",
      customer.isBlocked ? "Blocked" : "Active",
      customer.totalOrders || 0,
      customer.totalSpent || 0,
      formatDate(customer.createdAt),
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bookstore-customers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const activeCustomers = customers.filter(
    (customer) => !customer.isBlocked
  ).length;

  const blockedCustomers = customers.filter(
    (customer) => customer.isBlocked
  ).length;

  const pageOrders = customers.reduce(
    (total, customer) => total + Number(customer.totalOrders || 0),
    0
  );

  const pageRevenue = customers.reduce(
    (total, customer) => total + Number(customer.totalSpent || 0),
    0
  );

  const displayedCustomers = useMemo(() => {
    const result = [...customers];

    result.sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }

      if (sortBy === "orders") {
        return Number(b.totalOrders || 0) - Number(a.totalOrders || 0);
      }

      if (sortBy === "spent") {
        return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
      }

      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }

      return 0;
    });

    return result;
  }, [customers, sortBy]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fb 0%, #eef3ff 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} color="#172033">
              Customer Management
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.7 }}>
              Search customers by ID, manage accounts, and review purchase
              activity.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportCSV}
              disabled={!customers.length}
            >
              Export CSV
            </Button>

            <Button
              variant="contained"
              startIcon={
                refreshing ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Refresh />
                )
              }
              onClick={() => fetchCustomers(true)}
              disabled={refreshing || loading}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2.5,
            mb: 3,
          }}
        >
          {[
            {
              label: "Total Customers",
              value: pagination.totalCustomers,
              icon: <People />,
              color: "#3157d5",
              bg: "#e8efff",
            },
            {
              label: "Active on Page",
              value: activeCustomers,
              icon: <CheckCircle />,
              color: "#18864b",
              bg: "#e7f8ef",
            },
            {
              label: "Blocked on Page",
              value: blockedCustomers,
              icon: <Block />,
              color: "#d32f2f",
              bg: "#fff0f0",
            },
            {
              label: "Orders on Page",
              value: pageOrders,
              icon: <ShoppingBag />,
              color: "#d98200",
              bg: "#fff4df",
            },
          ].map((item) => (
            <Card
              key={item.label}
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid #e5e9f2" }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography color="text.secondary" fontSize={14}>
                      {item.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                      {Number(item.value || 0).toLocaleString("en-IN")}
                    </Typography>

                    {item.label === "Orders on Page" && (
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(pageRevenue)} spent
                      </Typography>
                    )}
                  </Box>

                  <Avatar sx={{ bgcolor: item.bg, color: item.color }}>
                    {item.icon}
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper
          elevation={0}
          sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #e5e9f2" }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search by customer ID, name, email, or phone..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              helperText="Enter the complete MongoDB customer ID or search using part of a name, email, or phone number."
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr) auto",
                },
                gap: 2,
              }}
            >
              <TextField
                select
                size="small"
                label="Account Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Customers</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Sort By"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Sort fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="newest">Newest Joined</MenuItem>
                <MenuItem value="oldest">Oldest Joined</MenuItem>
                <MenuItem value="name">Name A–Z</MenuItem>
                <MenuItem value="orders">Most Orders</MenuItem>
                <MenuItem value="spent">Highest Spending</MenuItem>
              </TextField>

              <Button
                variant="outlined"
                startIcon={<FilterAltOff />}
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </Box>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => fetchCustomers(true)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid #e5e9f2",
          }}
        >
          {loading ? (
            <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : displayedCustomers.length === 0 ? (
            <Box sx={{ py: 10, textAlign: "center" }}>
              <People sx={{ fontSize: 60, color: "text.disabled", mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                No customers found
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Try a different customer ID, name, email, phone, or status.
              </Typography>
              <Button sx={{ mt: 2 }} onClick={resetFilters}>
                Clear Filters
              </Button>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f7f9fc" }}>
                      <TableCell><b>Customer</b></TableCell>
                      <TableCell><b>Contact</b></TableCell>
                      <TableCell><b>Status</b></TableCell>
                      <TableCell align="center"><b>Orders</b></TableCell>
                      <TableCell align="right"><b>Total Spent</b></TableCell>
                      <TableCell><b>Joined</b></TableCell>
                      <TableCell align="right"><b>Actions</b></TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {displayedCustomers.map((customer) => {
                      const customerId = getCustomerId(customer);

                      return (
                        <TableRow
                          key={customerId}
                          hover
                          onClick={() => handleViewCustomer(customerId)}
                          title="Click to view customer details"
                          sx={{
                            cursor: "pointer",
                            transition: "background-color 0.2s",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar src={customer.avatar || undefined}>
                                {getInitials(customer.name)}
                              </Avatar>

                              <Box sx={{ minWidth: 0 }}>
                                <Typography fontWeight={700}>
                                  {customer.name || "Unnamed customer"}
                                </Typography>

                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      fontFamily: "monospace",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    ID: {customerId}
                                  </Typography>

                                  <Tooltip title="Copy full customer ID">
                                    <IconButton
                                      size="small"
                                      aria-label="Copy customer ID"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        copyCustomerId(customerId);
                                      }}
                                    >
                                      <ContentCopy sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={0.7} alignItems="center">
                                <Email sx={{ fontSize: 16, color: "text.secondary" }} />
                                <Typography
                                  variant="body2"
                                  sx={{ overflowWrap: "anywhere" }}
                                >
                                  {customer.email || "No email"}
                                </Typography>
                              </Stack>

                              <Typography variant="caption" color="text.secondary">
                                {customer.phone || "No phone"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              icon={customer.isBlocked ? <Block /> : <CheckCircle />}
                              label={customer.isBlocked ? "Blocked" : "Active"}
                              color={customer.isBlocked ? "error" : "success"}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Typography fontWeight={700}>
                              {Number(customer.totalOrders || 0)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {formatCurrency(customer.totalSpent)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(customer.createdAt)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.createdAt
                                ? new Date(customer.createdAt).toLocaleTimeString(
                                    "en-IN",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )
                                : "Time unavailable"}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="flex-end"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Tooltip title="View customer details and orders">
                                <IconButton
                                  color="primary"
                                  aria-label="View customer details"
                                  onClick={() => handleViewCustomer(customerId)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>

                              {customer.isBlocked ? (
                                <Tooltip title="Unblock customer">
                                  <span>
                                    <IconButton
                                      color="success"
                                      onClick={() => handleUnblockCustomer(customer)}
                                      disabled={actionLoading}
                                    >
                                      <CheckCircle />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Block customer">
                                  <IconButton
                                    color="warning"
                                    onClick={() => openBlockDialog(customer)}
                                    disabled={actionLoading}
                                  >
                                    <Block />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Tooltip title="Delete customer">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => openDeleteDialog(customer)}
                                    disabled={actionLoading}
                                  >
                                    <Delete />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              <TablePagination
                component="div"
                count={pagination.totalCustomers}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
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
      </Container>

      {/* CUSTOMER DETAILS */}
      <Dialog
        open={detailsOpen}
        onClose={() => !detailsLoading && setDetailsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Customer Details</DialogTitle>

        <DialogContent dividers>
          {detailsLoading ? (
            <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : selectedCustomer ? (
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Avatar
                  src={selectedCustomer.avatar || undefined}
                  sx={{ width: 72, height: 72, fontSize: 24 }}
                >
                  {getInitials(selectedCustomer.name)}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={800}>
                    {selectedCustomer.name || "Unnamed customer"}
                  </Typography>
                  <Typography color="text.secondary">
                    {selectedCustomer.email || "No email"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                  >
                    Customer ID: {getCustomerId(selectedCustomer)}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() =>
                      copyCustomerId(getCustomerId(selectedCustomer))
                    }
                  >
                    Copy Customer ID
                  </Button>
                  <Box>
                    <Chip
                      size="small"
                      label={selectedCustomer.isBlocked ? "Blocked" : "Active"}
                      color={selectedCustomer.isBlocked ? "error" : "success"}
                    />
                  </Box>
                </Box>
              </Stack>

              <Divider />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                {[
                  {
                    label: "Total Orders",
                    value: Number(selectedCustomer.totalOrders || 0),
                  },
                  {
                    label: "Total Spent",
                    value: formatCurrency(selectedCustomer.totalSpent),
                  },
                  {
                    label: "Joined Date",
                    value: formatDate(selectedCustomer.createdAt),
                  },
                ].map((item) => (
                  <Card key={item.label} variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" fontSize={13}>
                        {item.label}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>
                        {item.value}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Account Information
                </Typography>
                <Stack spacing={1}>
                  <Typography>
                    <b>Phone:</b> {selectedCustomer.phone || "Not provided"}
                  </Typography>
                  <Typography>
                    <b>Verified:</b> {selectedCustomer.isVerified ? "Yes" : "No"}
                  </Typography>
                  <Typography>
                    <b>Joined:</b> {formatDateTime(selectedCustomer.createdAt)}
                  </Typography>
                  {selectedCustomer.isBlocked && (
                    <Typography>
                      <b>Block Reason:</b>{" "}
                      {selectedCustomer.blockedReason || "No reason provided"}
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Recent Orders
                </Typography>

                {customerOrders.length === 0 ? (
                  <Alert severity="info">
                    This customer has no recent orders.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><b>Order ID</b></TableCell>
                          <TableCell><b>Order Date</b></TableCell>
                          <TableCell><b>Status</b></TableCell>
                          <TableCell><b>Payment</b></TableCell>
                          <TableCell align="right"><b>Total</b></TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {customerOrders.map((order) => (
                          <TableRow key={order._id}>
                            <TableCell sx={{ fontFamily: "monospace" }}>
                              #{String(order._id || "").slice(-8)}
                            </TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={order.orderStatus || order.status || "N/A"}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={order.paymentStatus || "N/A"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(
                                order.totalPrice ?? order.totalAmount
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          ) : (
            <Alert severity="info">
              Customer details are unavailable.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setDetailsOpen(false)}
            disabled={detailsLoading}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* BLOCK CUSTOMER */}
      <Dialog
        open={blockDialogOpen}
        onClose={closeBlockDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Block Customer</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Block <b>{customerToBlock?.name}</b>?
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Block Reason"
            placeholder="Enter the reason for blocking..."
            value={blockReason}
            onChange={(event) =>
              setBlockReason(event.target.value.slice(0, 300))
            }
            inputProps={{ maxLength: 300 }}
            helperText={`${blockReason.length}/300`}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={closeBlockDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleBlockCustomer}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Block Customer"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CUSTOMER */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Deleting a customer may be permanent. Review the related orders
            and your backend deletion policy before continuing.
          </Alert>

          <Typography sx={{ mt: 2 }}>
            Permanently delete <b>{customerToDelete?.name}</b>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Customer account and profile information will be removed according
            to your backend deletion logic.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteCustomer}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete Customer"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminCustomers;
