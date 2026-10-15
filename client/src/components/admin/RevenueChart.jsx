import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
} from "@mui/material";

function RevenueChart({ orders = [] }) {
  const currentYear = new Date().getFullYear();

  // Available years: 2000 to 2090, plus years in order history.
  const availableYears = useMemo(() => {
    const years = new Set();

    for (let year = 2000; year <= 2090; year++) {
      years.add(year);
    }

    orders.forEach((order) => {
      if (order.createdAt) {
        const year = new Date(order.createdAt).getFullYear();

        if (!Number.isNaN(year)) {
          years.add(year);
        }
      }
    });

    return [...years].sort((a, b) => b - a);
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  const yearOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.createdAt) return false;

      const date = new Date(order.createdAt);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(selectedYear) &&
        order.orderStatus !== "Cancelled"
      );
    });
  }, [orders, selectedYear]);

  const monthlyRevenue = useMemo(() => {
    return months.map((month, index) => {
      const revenue = yearOrders
        .filter((order) => {
          return new Date(order.createdAt).getMonth() === index;
        })
        .reduce(
          (total, order) => total + Number(order.totalPrice || 0),
          0
        );

      return {
        month,
        monthIndex: index,
        revenue,
      };
    });
  }, [yearOrders]);

  const dailyRevenue = useMemo(() => {
    if (selectedMonth === null) return [];

    const daysInMonth = new Date(
      Number(selectedYear),
      selectedMonth + 1,
      0
    ).getDate();

    return Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const day = dayIndex + 1;

      const revenue = yearOrders
        .filter((order) => {
          const date = new Date(order.createdAt);

          return (
            date.getMonth() === selectedMonth &&
            date.getDate() === day
          );
        })
        .reduce(
          (total, order) => total + Number(order.totalPrice || 0),
          0
        );

      return { day, revenue };
    });
  }, [selectedMonth, selectedYear, yearOrders]);

  const chartData =
    selectedMonth === null ? monthlyRevenue : dailyRevenue;

  const maxRevenue = Math.max(
    ...chartData.map((item) => item.revenue),
    1
  );

  const totalRevenue = chartData.reduce(
    (total, item) => total + item.revenue,
    0
  );

  const handleYearChange = (event) => {
    setSelectedYear(Number(event.target.value));
    setSelectedMonth(null);
  };

  const handleMonthClick = (monthIndex) => {
    setSelectedMonth(monthIndex);
  };

  return (
    <Box>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Revenue Overview
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {selectedMonth === null
              ? `Monthly revenue for ${selectedYear}`
              : `Daily revenue for ${monthNames[selectedMonth]} ${selectedYear}`}
          </Typography>
        </Box>

        <FormControl size="small">
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            sx={{ minWidth: 110 }}
            aria-label="Select revenue year"
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* TOTAL */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 2,
          backgroundColor: "action.hover",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {selectedMonth === null
            ? `${selectedYear} Revenue`
            : `${monthNames[selectedMonth]} ${selectedYear} Revenue`}
        </Typography>

        <Typography variant="h5" fontWeight="bold">
          ₹{totalRevenue.toLocaleString("en-IN")}
        </Typography>
      </Box>

      {/* CHART */}
      <Box
        sx={{
          height: 300,
          display: "flex",
          alignItems: "flex-end",
          gap: selectedMonth === null ? 1 : 0.5,
          px: 1,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          overflowX: "auto",
        }}
      >
        {chartData.map((item) => {
          const height =
            item.revenue === 0
              ? 4
              : Math.max((item.revenue / maxRevenue) * 220, 8);

          const label =
            selectedMonth === null ? item.month : item.day;

          return (
            <Box
              key={
                selectedMonth === null ? item.monthIndex : item.day
              }
              sx={{
                flex: selectedMonth === null ? 1 : "0 0 28px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                cursor: selectedMonth === null ? "pointer" : "default",
              }}
              onClick={() => {
                if (selectedMonth === null) {
                  handleMonthClick(item.monthIndex);
                }
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  mb: 0.5,
                  fontWeight: "bold",
                  fontSize: selectedMonth === null ? "0.7rem" : "0.55rem",
                  whiteSpace: "nowrap",
                }}
              >
                {item.revenue > 0
                  ? `₹${item.revenue.toLocaleString("en-IN")}`
                  : ""}
              </Typography>

              <Box
                sx={{
                  width: selectedMonth === null ? "65%" : "18px",
                  maxWidth: 55,
                  height,
                  borderRadius: "5px 5px 0 0",
                  background:
                    "linear-gradient(180deg, #1976d2, #42a5f5)",
                  transition: "0.2s",
                  "&:hover": {
                    opacity: selectedMonth === null ? 0.7 : 1,
                  },
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* BACK BUTTON */}
      {selectedMonth !== null && (
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => setSelectedMonth(null)}
        >
          ← Back to {selectedYear} Monthly Revenue
        </Button>
      )}

      {/* HINT */}
      {selectedMonth === null && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2 }}
        >
          💡 Click any month to see day-wise revenue.
        </Typography>
      )}
    </Box>
  );
}

export default RevenueChart;