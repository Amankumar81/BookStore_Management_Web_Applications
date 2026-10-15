import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  LinearProgress,
} from "@mui/material";

function OrderStatusChart({ orders = [] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const statuses = [
    { name: "Pending", icon: "⏳" },
    { name: "Processing", icon: "⚙️" },
    { name: "Shipped", icon: "🚚" },
    { name: "Delivered", icon: "✅" },
    { name: "Cancelled", icon: "❌" },
  ];

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Available years: 2000 to 2090, plus years found in order history.
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.createdAt) return false;

      const date = new Date(order.createdAt);

      return (
        date.getFullYear() === Number(selectedYear) &&
        date.getMonth() === Number(selectedMonth)
      );
    });
  }, [orders, selectedYear, selectedMonth]);

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Order Status
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <FormControl size="small" fullWidth>
          <Select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(Number(event.target.value))
            }
            displayEmpty
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <Select
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(Number(event.target.value))
            }
          >
            {months.map((month, index) => (
              <MenuItem key={month} value={index}>
                {month}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Orders in{" "}
        <strong>
          {months[selectedMonth]} {selectedYear}
        </strong>
        : <strong>{filteredOrders.length}</strong>
      </Typography>

      {filteredOrders.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          No orders found for this month.
        </Typography>
      )}

      {statuses.map((status) => {
        const count = filteredOrders.filter(
          (order) => order.orderStatus === status.name
        ).length;

        const percentage =
          filteredOrders.length > 0
            ? (count / filteredOrders.length) * 100
            : 0;

        return (
          <Box key={status.name} sx={{ mb: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 0.7,
              }}
            >
              <Typography variant="body2">
                {status.icon} {status.name}
              </Typography>

              <Typography variant="body2" fontWeight="bold">
                {count}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 5,
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

export default OrderStatusChart;