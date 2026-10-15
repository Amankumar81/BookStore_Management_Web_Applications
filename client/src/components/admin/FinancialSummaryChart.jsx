
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";

const API_URL = "http://localhost:5000";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const CATEGORIES = [
  { key: "paid", label: "Paid", color: "#2e7d32" },
  { key: "pending", label: "Pending", color: "#ed6c02" },
  { key: "cancelled", label: "Cancelled", color: "#d32f2f" },
  { key: "returned", label: "Returned", color: "#7b1fa2" },
];

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

function FinancialSummaryChart({ orders = [] }) {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [returns, setReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [error, setError] = useState("");

  const years = useMemo(
    () => Array.from({ length: 91 }, (_, index) => 2000 + index),
    []
  );

  useEffect(() => {
    let active = true;

    const fetchReturns = async () => {
      try {
        setLoadingReturns(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again to view return amounts.");
        }

        const response = await fetch(
          `${API_URL}/api/returns/admin/all?page=1&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Unexpected returns API response (${response.status}).`
          );
        }

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Unable to load return amounts.");
        }

        const list = Array.isArray(data.returnRequests)
          ? data.returnRequests
          : Array.isArray(data.returns)
            ? data.returns
            : Array.isArray(data.data)
              ? data.data
              : Array.isArray(data)
                ? datast
                : null;
        
        if (!list) {
          throw new Error("Could not recognize the returns API response.");
        }
        
        if (active) {
          setReturns(list);
        }
        
      } catch (err) {
        console.error("Financial summary error:", err);

        if (active) {
          setError(err.message || "Failed to load return amounts.");
        }
      } finally {
        if (active) setLoadingReturns(false);
      }
    };

    fetchReturns();

    return () => {
      active = false;
    };
  }, []);

  const amounts = useMemo(() => {
    const totals = {
      paid: 0,
      pending: 0,
      cancelled: 0,
      returned: 0,
    };

    const isSelectedPeriod = (value) => {
      if (!value) return false;

      const date = new Date(value);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month)
      );
    };

    orders.forEach((order) => {
      if (!isSelectedPeriod(order.createdAt)) return;

      const amount = Math.max(0, Number(order.totalPrice) || 0);

      if (order.orderStatus === "Cancelled") {
        totals.cancelled += amount;
      } else if (order.paymentStatus === "Paid") {
        totals.paid += amount;
      } else if (order.paymentStatus === "Pending") {
        totals.pending += amount;
      }
    });

    returns.forEach((item) => {
      if (!["Refunded", "Completed"].includes(item.status)) return;

      const date =
        item.completedAt || item.updatedAt || item.createdAt;

      if (!isSelectedPeriod(date)) return;

      totals.returned += Math.max(
        0,
        Number(item.refundAmount) || 0
      );
    });

    return totals;
  }, [orders, returns, month, year]);

  const maxAmount = Math.max(
    1,
    ...Object.values(amounts)
  );

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        height: 390,
        boxSizing: "border-box",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Financial Summary
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Monthly payment and return amounts
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 115 }}>
            <Select
              value={month}
              onChange={(event) =>
                setMonth(Number(event.target.value))
              }
              inputProps={{ "aria-label": "Filter by month" }}
            >
              {MONTHS.map((name, index) => (
                <MenuItem key={name} value={index}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 95 }}>
            <Select
              value={year}
              onChange={(event) =>
                setYear(Number(event.target.value))
              }
              inputProps={{ "aria-label": "Filter by year" }}
            >
              {years.map((itemYear) => (
                <MenuItem key={itemYear} value={itemYear}>
                  {itemYear}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loadingReturns && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Loading return data...
          </Typography>
        </Stack>
      )}

      <Stack spacing={2.5} sx={{ mt: 2 }}>
        {CATEGORIES.map((category) => {
          const value = amounts[category.key];
          const percentage = (value / maxAmount) * 100;

          return (
            <Box key={category.key}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 0.75 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {category.label}
                </Typography>

                <Typography variant="body2" fontWeight="bold">
                  {formatINR(value)}
                </Typography>
              </Stack>

              <Tooltip title={formatINR(value)}>
                <Box
                  sx={{
                    height: 18,
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${percentage}%`,
                      minWidth: value > 0 ? "3px" : 0,
                      bgcolor: category.color,
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </Box>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

export default FinancialSummaryChart;
