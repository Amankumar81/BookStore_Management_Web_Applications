import { useCallback, useEffect, useMemo, useState } from "react";
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
  InputLabel,
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
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileDownload as DownloadIcon,
  LocalOffer as CouponIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const initialForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minimumAmount: 0,
  expiresAt: "",
  usageLimit: "",
  isActive: true,
};

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("userToken") ||
  "";

const getDateKey = (value) => {
  if (!value) return "unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateGroupLabel = (value) => {
  if (!value) return "Date not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDateKey(date) === getDateKey(today)) return "Today";
  if (getDateKey(date) === getDateKey(yesterday)) return "Yesterday";

  return formatDate(date);
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

function AdminCoupons() {
  const navigate = useNavigate();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    }),
    []
  );

  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            data.errors?.join?.(", ") ||
            `Request failed (${response.status})`
        );
      }

      return data;
    },
    [authHeaders]
  );

  const normalizeCoupons = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.coupons)) return data.coupons;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.data?.coupons)) return data.data.coupons;
    return [];
  };

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request("/coupons");
      setCoupons(normalizeCoupons(data));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load coupons."));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const stats = useMemo(() => {
    const now = new Date();

    const active = coupons.filter((coupon) => {
      const notExpired =
        !coupon.expiresAt || new Date(coupon.expiresAt) >= now;

      const underLimit =
        coupon.usageLimit == null ||
        Number(coupon.usageLimit) === 0 ||
        Number(coupon.usedCount || 0) < Number(coupon.usageLimit);

      return coupon.isActive && notExpired && underLimit;
    }).length;

    const inactive = coupons.length - active;

    const totalUses = coupons.reduce(
      (sum, coupon) => sum + Number(coupon.usedCount || 0),
      0
    );

    return {
      total: coupons.length,
      active,
      inactive,
      totalUses,
    };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const matchesSearch =
        !query ||
        String(coupon.code || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && coupon.isActive) ||
        (statusFilter === "inactive" && !coupon.isActive);

      const matchesType =
        typeFilter === "all" || coupon.discountType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [coupons, search, statusFilter, typeFilter]);

  const paginatedCoupons = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCoupons.slice(start, start + rowsPerPage);
  }, [filteredCoupons, page, rowsPerPage]);

  const groupedCoupons = useMemo(() => {
    const groups = new Map();

    paginatedCoupons.forEach((coupon) => {
      const key = getDateKey(coupon.createdAt);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: getDateGroupLabel(coupon.createdAt),
          coupons: [],
        });
      }

      groups.get(key).coupons.push(coupon);
    });

    return Array.from(groups.values());
  }, [paginatedCoupons]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setForm(initialForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (coupon) => {
    setEditingCoupon(coupon);

    setForm({
      code: coupon.code || "",
      discountType: coupon.discountType || "percentage",
      discountValue: coupon.discountValue ?? "",
      minimumAmount: coupon.minimumAmount ?? 0,
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 10)
        : "",
      usageLimit: coupon.usageLimit ?? "",
      isActive: Boolean(coupon.isActive),
    });

    setFormError("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingCoupon(null);
    setFormError("");
  };

  const validateForm = () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discountValue);
    const minimum = Number(form.minimumAmount || 0);
    const limit =
      form.usageLimit === "" ? null : Number(form.usageLimit);

    if (!code) return "Please enter a coupon code.";
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return "Use only letters, numbers, hyphens, and underscores in the code.";
    }

    if (!Number.isFinite(value) || value <= 0) {
      return "Discount value must be greater than zero.";
    }

    if (form.discountType === "percentage" && value > 100) {
      return "Percentage discount cannot exceed 100%.";
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      return "Minimum order amount cannot be negative.";
    }

    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      return "Usage limit must be a positive whole number, or left blank for unlimited use.";
    }

    if (form.expiresAt) {
      const expiry = new Date(`${form.expiresAt}T23:59:59`);
      if (Number.isNaN(expiry.getTime())) {
        return "Please enter a valid expiry date.";
      }
    }

    return "";
  };

  const handleSave = async () => {
    setFormError("");

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minimumAmount: Number(form.minimumAmount || 0),
      expiresAt: form.expiresAt
        ? new Date(`${form.expiresAt}T23:59:59`).toISOString()
        : null,
      usageLimit:
        form.usageLimit === "" ? null : Number(form.usageLimit),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);

    try {
      if (editingCoupon) {
        await request(`/coupons/${editingCoupon._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Coupon updated successfully.");
      } else {
        await request("/coupons", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Coupon created successfully.");
      }

      setDialogOpen(false);
      setEditingCoupon(null);
      setForm(initialForm);
      await fetchCoupons();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to save coupon."));
    } finally {
      setSaving(false);
    }
  };

  const toggleCouponStatus = async (coupon) => {
    setError("");
    setSuccess("");

    try {
      await request(`/coupons/${coupon._id}`, {
        method: "PUT",
        body: JSON.stringify({
          isActive: !coupon.isActive,
        }),
      });

      setSuccess(
        `Coupon ${coupon.isActive ? "deactivated" : "activated"} successfully.`
      );

      await fetchCoupons();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update coupon status."));
    }
  };

  const confirmDelete = (coupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    setError("");
    setSuccess("");

    try {
      await request(`/coupons/${couponToDelete._id}`, {
        method: "DELETE",
      });

      setSuccess("Coupon deleted successfully.");
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      await fetchCoupons();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete coupon."));
    }
  };

  const exportCSV = () => {
    const headers = [
      "Code",
      "Discount Type",
      "Discount Value",
      "Minimum Amount",
      "Used Count",
      "Usage Limit",
      "Active",
      "Created Date",
      "Expiry Date",
    ];

    const rows = filteredCoupons.map((coupon) => [
      coupon.code || "",
      coupon.discountType || "",
      coupon.discountValue ?? "",
      coupon.minimumAmount ?? 0,
      coupon.usedCount ?? 0,
      coupon.usageLimit ?? "Unlimited",
      coupon.isActive ? "Yes" : "No",
      formatDate(coupon.createdAt),
      formatDate(coupon.expiresAt),
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
    link.download = "bookstore-coupons.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.isActive) {
      return { label: "Inactive", color: "default" };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { label: "Expired", color: "error" };
    }

    if (
      coupon.usageLimit != null &&
      Number(coupon.usageLimit) > 0 &&
      Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
    ) {
      return { label: "Limit Reached", color: "warning" };
    }

    return { label: "Active", color: "success" };
  };

  const formatDiscount = (coupon) => {
    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}%`;
    }

    return `₹${Number(coupon.discountValue || 0).toLocaleString("en-IN")}`;
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Coupon Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Create, manage, and track bookstore discounts.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCoupons}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCSV}
            disabled={!filteredCoupons.length}
          >
            Export CSV
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            Add Coupon
          </Button>
        </Stack>
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

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Total Coupons",
            value: stats.total,
            color: "primary.main",
          },
          {
            label: "Currently Usable",
            value: stats.active,
            color: "success.main",
          },
          {
            label: "Inactive / Unusable",
            value: stats.inactive,
            color: "warning.main",
          },
          {
            label: "Total Uses",
            value: stats.totalUses,
            color: "secondary.main",
          },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  {item.label}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ mt: 1, color: item.color }}
                >
                  {item.value.toLocaleString("en-IN")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              label="Search coupon code"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ mb: 0.5 }}>
                Status
              </Typography>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ mb: 0.5 }}>
                Discount Type
              </Typography>
              <Select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All types</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed amount</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="text"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined">
        {loading ? (
          <Box
            sx={{
              py: 8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={28} />
            <Typography color="text.secondary">
              Loading coupons...
            </Typography>
          </Box>
        ) : filteredCoupons.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CouponIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="h6">No coupons found</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Try changing your filters or create a new coupon.
            </Typography>
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
            >
              Create Coupon
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 650 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Coupon Code</TableCell>
                    <TableCell>Discount</TableCell>
                    <TableCell>Minimum Order</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {groupedCoupons.map((group) => (
                    <>
                      <TableRow
                        key={`date-${group.key}`}
                        sx={{
                          "& td": {
                            bgcolor: "action.hover",
                            py: 1,
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell colSpan={8}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography
                              variant="subtitle2"
                              fontWeight={800}
                            >
                              {group.label}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${group.coupons.length} coupon${
                                group.coupons.length === 1 ? "" : "s"
                              }`}
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {group.coupons.map((coupon) => {
                        const status = getCouponStatus(coupon);

                        return (
                          <TableRow hover key={coupon._id}>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <CouponIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Box>
                                  <Typography
                                    fontWeight={800}
                                    sx={{ fontFamily: "monospace" }}
                                  >
                                    {coupon.code}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    ID: {coupon._id || "—"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>

                            <TableCell>
                              <Typography fontWeight={700}>
                                {formatDiscount(coupon)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {coupon.discountType === "percentage"
                                  ? "Percentage"
                                  : "Fixed amount"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              ₹
                              {Number(
                                coupon.minimumAmount || 0
                              ).toLocaleString("en-IN")}
                            </TableCell>

                            <TableCell>
                              <Typography>
                                {Number(coupon.usedCount || 0)} /{" "}
                                {coupon.usageLimit == null ||
                                Number(coupon.usageLimit) === 0
                                  ? "∞"
                                  : coupon.usageLimit}
                              </Typography>
                              {coupon.usageLimit != null &&
                                Number(coupon.usageLimit) > 0 && (
                                  <Box
                                    sx={{
                                      height: 4,
                                      mt: 0.75,
                                      borderRadius: 2,
                                      bgcolor: "action.hover",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        height: "100%",
                                        width: `${Math.min(
                                          100,
                                          (Number(coupon.usedCount || 0) /
                                            Number(coupon.usageLimit)) *
                                            100
                                        )}%`,
                                        bgcolor: "primary.main",
                                      }}
                                    />
                                  </Box>
                                )}
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={status.label}
                                color={status.color}
                                variant={
                                  status.color === "default"
                                    ? "outlined"
                                    : "filled"
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(coupon.createdAt)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {coupon.createdAt
                                  ? new Date(
                                      coupon.createdAt
                                    ).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Time unavailable"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(coupon.expiresAt)}
                              </Typography>
                              {coupon.expiresAt && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Until end of day
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              <Stack
                                direction="row"
                                spacing={0}
                                justifyContent="flex-end"
                              >
                                <Tooltip
                                  title={
                                    coupon.isActive
                                      ? "Deactivate coupon"
                                      : "Activate coupon"
                                  }
                                >
                                  <IconButton
                                    size="small"
                                    color={
                                      coupon.isActive
                                        ? "success"
                                        : "default"
                                    }
                                    onClick={() =>
                                      toggleCouponStatus(coupon)
                                    }
                                  >
                                    {coupon.isActive ? (
                                      <ToggleOnIcon />
                                    ) : (
                                      <ToggleOffIcon />
                                    )}
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Edit coupon">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      openEditDialog(coupon)
                                    }
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Delete coupon">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      confirmDelete(coupon)
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            <TablePagination
              component="div"
              count={filteredCoupons.length}
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

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingCoupon ? "Edit Coupon" : "Create Coupon"}
        </DialogTitle>

        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Coupon Code"
              value={form.code}
              onChange={(event) =>
                updateForm("code", event.target.value.toUpperCase())
              }
              fullWidth
              required
              helperText="Example: SAVE10"
              inputProps={{ maxLength: 40 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="discount-type-label">Discount Type</InputLabel>
                  <Select
                    labelId="discount-type-label"
                    label="Discount Type"
                    value={form.discountType}
                    onChange={(event) =>
                      updateForm("discountType", event.target.value)
                    }
                  >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label={
                    form.discountType === "percentage"
                      ? "Percentage Value"
                      : "Fixed Value"
                  }
                  type="number"
                  value={form.discountValue}
                  onChange={(event) =>
                    updateForm("discountValue", event.target.value)
                  }
                  fullWidth
                  required
                />
              </Grid>
            </Grid>

            <TextField
              label="Minimum Order Amount (₹)"
              type="number"
              value={form.minimumAmount}
              onChange={(event) =>
                updateForm("minimumAmount", event.target.value)
              }
              fullWidth
            />

            <TextField
              label="Expiry Date"
              type={form.expiresAt ? "date" : "text"}
              placeholder="dd-mm-yyyy"
              InputLabelProps={{ shrink: true }}
              onFocus={(e) => {
                e.target.type = "date";
              }}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text";
              }}
              value={form.expiresAt}
              onChange={(event) =>
                updateForm("expiresAt", event.target.value)
              }
              fullWidth
              helperText="Coupon remains valid through the selected date."
            />

            <TextField
              label="Usage Limit"
              type="number"
              value={form.usageLimit}
              onChange={(event) =>
                updateForm("usageLimit", event.target.value)
              }
              fullWidth
              helperText="Leave blank for unlimited use."
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : "Save Coupon"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the coupon{" "}
            <strong>{couponToDelete?.code}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminCoupons;