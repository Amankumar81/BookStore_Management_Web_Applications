
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Divider,
  Avatar,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useNavigate } from "react-router-dom";

import DashboardStatCard from "../../components/admin/DashboardStatCard";
import RevenueChart from "../../components/admin/RevenueChart";
import OrderStatusChart from "../../components/admin/OrderStatusChart";
import FinancialSummaryChart from "../../components/admin/FinancialSummaryChart";
import AdminNotificationBell from "../../components/admin/AdminNotificationBell";

const API_URL = "https://bookstore-management-web-applications.onrender.com";
const LOW_STOCK_LIMIT = 5;

// ==========================================
// HELPERS
// ==========================================

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
};

const ORDER_STATUSES = [
  { key: "Pending", color: "warning" },
  { key: "Processing", color: "info" },
  { key: "Shipped", color: "primary" },
  { key: "Delivered", color: "success" },
  { key: "Cancelled", color: "error" },
];

const statusColor = (status) =>
  ORDER_STATUSES.find((item) => item.key === status)?.color || "default";

const getResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    success: false,
    message: text || `Server returned ${response.status}`,
  };
};

// ==========================================
// SMALL REUSABLE COMPONENTS
// ==========================================

function SectionCard({ title, subtitle, action, children }) {
  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {action}
      </Box>

      <Divider />

      {children}
    </Paper>
  );
}

function MiniStat({ label, value, hint, trend }) {
  return (
    <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>

        {typeof trend === "number" && (
          <Chip
            size="small"
            color={trend >= 0 ? "success" : "error"}
            icon={
              trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />
            }
            label={`${Math.abs(trend).toFixed(0)}%`}
          />
        )}
      </Box>

      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

function BookAvatar({ book }) {
  const src = book.image || book.coverImage || book.imageUrl;

  return (
    <Avatar
      variant="rounded"
      src={src}
      alt={book.title}
      sx={{ width: 36, height: 48, bgcolor: "primary.light" }}
    >
      📖
    </Avatar>
  );
}

function DashboardSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Skeleton variant="text" width={320} height={48} />
      <Skeleton variant="text" width={420} />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {[0, 1, 2, 3].map((item) => (
          <Grid key={item} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton
              variant="rounded"
              height={130}
              sx={{ borderRadius: 3 }}
            />
          </Grid>
        ))}
      </Grid>

      <Skeleton
        variant="rounded"
        height={320}
        sx={{ mt: 3, borderRadius: 3 }}
      />
    </Box>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function AdminDashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ==========================================
  // FETCH DASHBOARD DATA
  // ==========================================

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please log in again."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [ordersResponse, booksResponse] = await Promise.all([
        fetch(`${API_URL}/api/orders`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_URL}/api/books`, {
          method: "GET",
          headers,
        }),
      ]);

      const ordersData = await getResponseData(ordersResponse);
      const booksData = await getResponseData(booksResponse);

      if (!ordersResponse.ok) {
        if (ordersResponse.status === 401) {
          throw new Error(
            "Orders API unauthorized. Please log in again as admin."
          );
        }

        throw new Error(
          ordersData.message ||
            `Failed to fetch orders (${ordersResponse.status})`
        );
      }

      if (!booksResponse.ok) {
        throw new Error(
          booksData.message ||
            `Failed to fetch books (${booksResponse.status})`
        );
      }

      setOrders(
        Array.isArray(ordersData.orders) ? ordersData.orders : []
      );

      setBooks(
        Array.isArray(booksData.books) ? booksData.books : []
      );

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const lastMonthDate = new Date(
      thisYear,
      thisMonth - 1,
      1
    );

    const validOrders = orders.filter(
      (order) => order.orderStatus !== "Cancelled"
    );

    const orderTotal = (order) => Number(order.totalPrice || 0);

    const totalRevenue = validOrders.reduce(
      (sum, order) => sum + orderTotal(order),
      0
    );

    const todayOrders = orders.filter(
      (order) =>
        order.createdAt &&
        !Number.isNaN(new Date(order.createdAt).getTime()) &&
        isSameDay(new Date(order.createdAt), now)
    );

    const todayRevenue = todayOrders
      .filter((order) => order.orderStatus !== "Cancelled")
      .reduce((sum, order) => sum + orderTotal(order), 0);

    const revenueInMonth = (year, month) =>
      validOrders
        .filter((order) => {
          if (!order.createdAt) return false;

          const date = new Date(order.createdAt);

          return (
            !Number.isNaN(date.getTime()) &&
            date.getFullYear() === year &&
            date.getMonth() === month
          );
        })
        .reduce((sum, order) => sum + orderTotal(order), 0);

    const monthRevenue = revenueInMonth(thisYear, thisMonth);

    const lastMonthRevenue = revenueInMonth(
      lastMonthDate.getFullYear(),
      lastMonthDate.getMonth()
    );

    const growth =
      lastMonthRevenue > 0
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : null;

    const statusCounts = ORDER_STATUSES.reduce((acc, status) => {
      acc[status.key] = orders.filter(
        (order) =>
          (order.orderStatus || "Pending") === status.key
      ).length;

      return acc;
    }, {});

    const lowStockBooks = books
      .filter(
        (book) => Number(book.stock || 0) <= LOW_STOCK_LIMIT
      )
      .sort(
        (a, b) =>
          Number(a.stock || 0) - Number(b.stock || 0)
      );

    const outOfStock = books.filter(
      (book) => Number(book.stock || 0) === 0
    ).length;

    const inventoryValue = books.reduce(
      (sum, book) =>
        sum + Number(book.price || 0) * Number(book.stock || 0),
      0
    );

    const totalCopies = books.reduce(
      (sum, book) => sum + Number(book.stock || 0),
      0
    );

    const unitsSold = books.reduce(
      (sum, book) => sum + Number(book.sold || 0),
      0
    );

    const actionNeeded =
      (statusCounts.Pending || 0) +
      (statusCounts.Processing || 0);

    return {
      totalRevenue,
      todayOrders: todayOrders.length,
      todayRevenue,
      monthRevenue,
      growth,
      avgOrderValue: validOrders.length
        ? totalRevenue / validOrders.length
        : 0,
      statusCounts,
      lowStockBooks,
      outOfStock,
      inventoryValue,
      totalCopies,
      unitsSold,
      actionNeeded,
    };
  }, [orders, books]);

  // ==========================================
  // BEST SELLERS / CATEGORIES / RECENT ORDERS
  // ==========================================

  const bestSellingBooks = useMemo(
    () =>
      [...books]
        .sort(
          (a, b) =>
            Number(b.sold || 0) - Number(a.sold || 0)
        )
        .slice(0, 5),
    [books]
  );

  const categories = useMemo(() => {
    const map = new Map();

    books.forEach((book) => {
      const name = book.category || book.genre || "Uncategorized";

      const entry = map.get(name) || {
        name,
        titles: 0,
        sold: 0,
      };

      entry.titles += 1;
      entry.sold += Number(book.sold || 0);

      map.set(name, entry);
    });

    return [...map.values()]
      .sort(
        (a, b) => b.sold - a.sold || b.titles - a.titles
      )
      .slice(0, 5);
  }, [books]);

  const maxCategorySold = Math.max(
    1,
    ...categories.map((category) => category.sold)
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        )
        .slice(0, 5),
    [orders]
  );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        p: { xs: 2, md: 4 },
        boxSizing: "border-box",
      }}
    >
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
          <Typography variant="h4" fontWeight="bold">
            {getGreeting()} 👋
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {stats.actionNeeded > 0
              ? `${stats.actionNeeded} order${
                  stats.actionNeeded > 1 ? "s" : ""
                } waiting to be processed`
              : "All orders are up to date"}

            {stats.lowStockBooks.length > 0 &&
              ` · ${stats.lowStockBooks.length} book${
                stats.lowStockBooks.length > 1 ? "s" : ""
              } running low`}
          </Typography>

          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
        </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <AdminNotificationBell />
      
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </Box>
      </Box>

      {refreshing && (
        <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
      )}

      {/* ERROR */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => fetchDashboardData(true)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* MAIN STATISTICS */}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Total Revenue"
            value={formatINR(stats.totalRevenue)}
            subtitle="Excluding cancelled orders"
            icon="💰"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Total Orders"
            value={orders.length}
            subtitle={`${stats.todayOrders} placed today`}
            icon="📦"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Book Titles"
            value={books.length}
            subtitle={`${stats.totalCopies.toLocaleString("en-IN")} copies in stock`}
            icon="📚"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Needs Restock"
            value={stats.lowStockBooks.length}
            subtitle={`${stats.outOfStock} out of stock`}
            icon="⚠️"
          />
        </Grid>
      </Grid>

      {/* BUSINESS SNAPSHOT */}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <MiniStat
            label="This month"
            value={formatINR(stats.monthRevenue)}
            hint="vs last month"
            trend={stats.growth ?? undefined}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <MiniStat
            label="Today's sales"
            value={formatINR(stats.todayRevenue)}
            hint={`${stats.todayOrders} order${
              stats.todayOrders === 1 ? "" : "s"
            }`}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <MiniStat
            label="Avg. order value"
            value={formatINR(Math.round(stats.avgOrderValue))}
            hint={`${stats.unitsSold.toLocaleString("en-IN")} books sold overall`}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <MiniStat
            label="Inventory value"
            value={formatINR(stats.inventoryValue)}
            hint="Price × stock on shelf"
          />
        </Grid>
      </Grid>

      {/* ORDER PIPELINE */}

      <Typography variant="h5" fontWeight="bold" sx={{ mt: 5, mb: 3 }}>
        Order Pipeline
      </Typography>

      <Grid container spacing={3}>
        {ORDER_STATUSES.map(({ key, color }) => {
          const count = stats.statusCounts[key] || 0;

          const percent = orders.length
            ? (count / orders.length) * 100
            : 0;

          return (
            <Grid key={key} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Paper
                elevation={2}
                onClick={() => navigate("/admin/orders")}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  cursor: "pointer",
                  transition: "transform 0.15s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                  },
                }}
              >
                <Typography color="text.secondary">
                  {key}
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ mt: 1, mb: 1.5 }}
                >
                  {count}
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={percent}
                  color={color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* EXISTING CHARTS */}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              height: "100%",
            }}
          >
            <RevenueChart orders={orders} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              height: "100%",
            }}
          >
            <OrderStatusChart orders={orders} />
          </Paper>
        </Grid>
      </Grid>

      {/* NEW FINANCIAL SUMMARY CHART */}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <FinancialSummaryChart orders={orders} />
        </Grid>
      </Grid>

      {/* BEST SELLERS + CATEGORIES */}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="🏆 Best Selling Books"
            subtitle="Ranked by copies sold"
          >
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={48}>#</TableCell>
                    <TableCell>Book</TableCell>
                    <TableCell>ISBN</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Sold</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {bestSellingBooks.map((book, index) => (
                    <TableRow
                      key={book._id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/admin/books/edit/${book._id}`)
                      }
                    >
                      <TableCell>
                        {["🥇", "🥈", "🥉"][index] || index + 1}
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <BookAvatar book={book} />

                          <Box>
                            <Typography fontWeight={600}>
                              {book.title}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {book.author}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>{book.isbn || "—"}</TableCell>

                      <TableCell align="right">
                        {Number(book.stock || 0)}
                      </TableCell>

                      <TableCell align="right">
                        <Chip
                          label={book.sold || 0}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {bestSellingBooks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No books available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="📖 Top Categories"
            subtitle="Genres by copies sold"
          >
            <Box sx={{ p: 3 }}>
              {categories.length === 0 && (
                <Typography color="text.secondary" align="center">
                  No category data yet.
                </Typography>
              )}

              <Stack spacing={2.5}>
                {categories.map((category) => (
                  <Box key={category.name}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography fontWeight={600}>
                        {category.name}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {category.sold} sold · {category.titles} title
                        {category.titles === 1 ? "" : "s"}
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={(category.sold / maxCategorySold) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* INVENTORY ALERTS + RECENT ORDERS */}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard
            title="⚠️ Inventory Alerts"
            subtitle={`Books with ${LOW_STOCK_LIMIT} or fewer copies left`}
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate("/admin/books")}
              >
                All Books
              </Button>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Book</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {stats.lowStockBooks.slice(0, 6).map((book) => {
                    const stock = Number(book.stock || 0);

                    return (
                      <TableRow key={book._id} hover>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <BookAvatar book={book} />

                            <Box>
                              <Typography fontWeight={600}>
                                {book.title}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {book.isbn || book.author}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Chip
                            label={
                              stock === 0
                                ? "Out of stock"
                                : `${stock} left`
                            }
                            color={stock === 0 ? "error" : "warning"}
                            size="small"
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Tooltip title="Open book to update stock">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() =>
                                navigate(`/admin/books/edit/${book._id}`)
                              }
                            >
                              Restock
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {stats.lowStockBooks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Every book is well stocked 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard
            title="🕐 Recent Orders"
            subtitle="Click an order to see its details"
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate("/admin/orders")}
              >
                View All
              </Button>
            }
          >
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order._id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/admin/orders/${order._id}`)
                      }
                    >
                      <TableCell>
                        <Typography fontWeight={600}>
                          #{order._id?.slice(-8).toUpperCase()}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )
                            : ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {order.user?.name ||
                          order.user?.email ||
                          "Customer"}
                      </TableCell>

                      <TableCell align="right">
                        {formatINR(order.totalPrice)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={order.orderStatus || "Pending"}
                          size="small"
                          color={statusColor(
                            order.orderStatus || "Pending"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* ADMIN MANAGEMENT */}

      <Typography variant="h5" fontWeight="bold" sx={{ mt: 5, mb: 3 }}>
        Admin Management
      </Typography>

      <Grid container spacing={3}>
        {[
          {
            icon: "📦",
            title: "Orders",
            text: "View and update customer orders.",
            button: "Manage Orders",
            to: "/admin/orders",
          },
          {
            icon: "📚",
            title: "Books",
            text: "Add, edit and delete books.",
            button: "Manage Books",
            to: "/admin/books",
          },
          {
            icon: "👥",
            title: "Customers",
            text: "View and manage customers.",
            button: "Manage Customers",
            to: "/admin/customers",
          },
          {
            icon: "🎟️",
            title: "Coupons",
            text: "Manage discount coupons.",
            button: "Manage Coupons",
            to: "/admin/coupons",
          },
          {
            icon: "🔄",
            title: "Returns",
            text: "Review return requests and track refund status.",
            button: "Manage Returns",
            to: "/admin/returns",
          },
        ].map((item) => (
          <Grid key={item.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                {item.icon} {item.title}
              </Typography>

              <Typography color="text.secondary" sx={{ my: 2 }}>
                {item.text}
              </Typography>

              <Button
                variant="contained"
                onClick={() => navigate(item.to)}
              >
                {item.button}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
