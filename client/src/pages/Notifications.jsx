import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";
import {
  NotificationsNone,
  ShoppingBagOutlined,
  LocalShippingOutlined,
  CheckCircle,
  DoneAll,
  Refresh,
  ArrowForward,
  Delete,
  DeleteSweep,
  FilterList,
} from "@mui/icons-material";

const API_URL = "http://localhost:5000/api/notifications";
const REFRESH_INTERVAL = 15000;

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error(
      "Expected JSON but received a non-JSON response:",
      response.url,
      response.status,
      responseText.slice(0, 200)
    );

    throw new Error(
      `Server returned a non-JSON response (HTTP ${response.status}). Check the backend routes and server.`
    );
  }

  return response.json();
}

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const mountedRef = useRef(false);
  const requestInProgressRef = useRef(false);

  const getToken = () => localStorage.getItem("token");

  // Fetch notifications and unread count.
  // Silent refresh does not show the full-page loading spinner.
  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (requestInProgressRef.current) return;

      const token = getToken();

      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        setError("Please log in to view your notifications.");
        setLoading(false);
        return;
      }

      requestInProgressRef.current = true;

      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [notificationsResponse, unreadResponse] = await Promise.all([
          fetch(API_URL, { headers }),
          fetch(`${API_URL}/unread-count`, { headers }),
        ]);

        const [notificationsData, unreadData] = await Promise.all([
          parseApiResponse(notificationsResponse),
          parseApiResponse(unreadResponse),
        ]);

        if (!notificationsResponse.ok) {
          throw new Error(
            notificationsData.message || "Failed to load notifications."
          );
        }

        if (!unreadResponse.ok) {
          throw new Error(
            unreadData.message || "Failed to load unread notification count."
          );
        }

        if (!mountedRef.current) return;

        setNotifications(
          Array.isArray(notificationsData.notifications)
            ? notificationsData.notifications
            : []
        );

        setUnreadCount(Number(unreadData.unreadCount || 0));

        if (silent) {
          setError("");
        }
      } catch (err) {
        console.error("LOAD NOTIFICATIONS ERROR:", err);

        if (mountedRef.current && !silent) {
          setError(err.message || "Unable to load notifications.");
        }
      } finally {
        requestInProgressRef.current = false;

        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initial load and automatic silent refresh.
  useEffect(() => {
    mountedRef.current = true;

    loadNotifications();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications({ silent: true });
      }
    }, REFRESH_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNotifications({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "unread") {
        return !notification.isRead;
      }

      if (filter === "orders") {
        return ["order_placed", "order_status_update"].includes(
          notification.type
        );
      }

      if (filter === "delivery") {
        return notification.type === "delivery_reminder";
      }

      return true;
    });
  }, [notifications, filter]);

  const markAsRead = async (notificationId) => {
    const token = getToken();

    if (!token) {
      setError("Please log in to continue.");
      return false;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to mark notification as read.");
      }

      await loadNotifications({ silent: true });
      return true;
    } catch (err) {
      console.error("MARK NOTIFICATION READ ERROR:", err);
      setError(err.message || "Unable to update notification.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();

    if (!token) {
      setError("Please log in to continue.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to mark all as read.");
      }

      await loadNotifications({ silent: true });
    } catch (err) {
      console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
      setError(err.message || "Unable to mark all notifications as read.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    const token = getToken();

    if (!token) {
      setError("Please log in to continue.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete notification.");
      }

      setDeleteTarget(null);
      await loadNotifications({ silent: true });
    } catch (err) {
      console.error("DELETE NOTIFICATION ERROR:", err);
      setError(err.message || "Unable to delete notification.");
    } finally {
      setActionLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    const token = getToken();

    if (!token) {
      setError("Please log in to continue.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/clear-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to clear notifications.");
      }

      setClearDialogOpen(false);
      await loadNotifications({ silent: true });
    } catch (err) {
      console.error("CLEAR NOTIFICATIONS ERROR:", err);
      setError(err.message || "Unable to clear notifications.");
    } finally {
      setActionLoading(false);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      const updated = await markAsRead(notification._id);
      if (!updated) return;
    }

    const orderId =
      typeof notification.relatedOrder === "object"
        ? notification.relatedOrder?._id
        : notification.relatedOrder;

    if (orderId) {
      navigate(`/orders/${orderId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_placed":
        return <ShoppingBagOutlined />;
      case "order_status_update":
      case "delivery_reminder":
        return <LocalShippingOutlined />;
      default:
        return <NotificationsNone />;
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Box sx={{ minHeight: "70vh", bgcolor: "#f8fafc", py: 5 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e5e7eb",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
              bgcolor: "#fff",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                }}
              >
                <NotificationsNone fontSize="large" />
              </Box>

              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Notifications
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {unreadCount} unread notification
                  {unreadCount === 1 ? "" : "s"} · {notifications.length} total
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
            >
              <Tooltip title="Refresh notifications">
                <span>
                  <IconButton
                    aria-label="Refresh notifications"
                    onClick={() => loadNotifications()}
                    disabled={loading || actionLoading}
                  >
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>

              <Button
                variant="outlined"
                startIcon={<DoneAll />}
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || loading || actionLoading}
              >
                Mark all read
              </Button>

              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteSweep />}
                onClick={() => setClearDialogOpen(true)}
                disabled={notifications.length === 0 || loading || actionLoading}
              >
                Clear all
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Filters */}
          <Box
            sx={{
              px: 2,
              py: 2,
              bgcolor: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <FilterList color="action" />

            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(_, value) => {
                if (value !== null) setFilter(value);
              }}
              size="small"
              sx={{
                flexWrap: "wrap",
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  textTransform: "none",
                },
              }}
            >
              <ToggleButton value="all">
                All ({notifications.length})
              </ToggleButton>
              <ToggleButton value="unread">
                Unread ({unreadCount})
              </ToggleButton>
              <ToggleButton value="orders">Orders</ToggleButton>
              <ToggleButton value="delivery">Delivery</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading and empty states */}
          {loading ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                Loading notifications...
              </Typography>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ py: 9, px: 3, textAlign: "center" }}>
              <NotificationsNone
                sx={{ fontSize: 64, color: "#9ca3af", mb: 1 }}
              />

              <Typography variant="h6" fontWeight={700}>
                {notifications.length === 0
                  ? "You're all caught up!"
                  : "No notifications in this filter"}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {notifications.length === 0
                  ? "Your order and account notifications will appear here."
                  : "Try another filter to see your notifications."}
              </Typography>

              {notifications.length === 0 && (
                <Button
                  sx={{ mt: 3 }}
                  variant="contained"
                  onClick={() => navigate("/books")}
                >
                  Explore books
                </Button>
              )}

              {notifications.length > 0 && (
                <Button sx={{ mt: 2 }} onClick={() => setFilter("all")}>
                  Show all notifications
                </Button>
              )}
            </Box>
          ) : (
            <Stack divider={<Divider />} spacing={0}>
              {filteredNotifications.map((notification) => (
                <Box
                  key={notification._id}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: notification.isRead ? "#fff" : "#eff6ff",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      bgcolor: notification.isRead ? "#f9fafb" : "#dbeafe",
                    },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      color: notification.isRead ? "#6b7280" : "#2563eb",
                      bgcolor: notification.isRead ? "#f3f4f6" : "#dbeafe",
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Typography fontWeight={800}>
                        {notification.title}
                      </Typography>

                      {!notification.isRead && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "#2563eb",
                          }}
                        />
                      )}
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                    >
                      {notification.message}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      {formatDate(notification.createdAt)}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                      sx={{ mt: 1 }}
                    >
                      {notification.relatedOrder && (
                        <Button
                          size="small"
                          endIcon={<ArrowForward />}
                          onClick={() => openNotification(notification)}
                          disabled={actionLoading}
                          sx={{ px: 0 }}
                        >
                          View order
                        </Button>
                      )}

                      {!notification.isRead && (
                        <Button
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => markAsRead(notification._id)}
                          disabled={actionLoading}
                          sx={{ px: 0 }}
                        >
                          Mark as read
                        </Button>
                      )}

                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => setDeleteTarget(notification)}
                        disabled={actionLoading}
                        sx={{ px: 0 }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Container>

      {/* Delete one confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!actionLoading) setDeleteTarget(null);
        }}
      >
        <DialogTitle>Delete notification?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This notification will be permanently removed from your list.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteNotification(deleteTarget?._id)}
            disabled={actionLoading || !deleteTarget}
          >
            {actionLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear all confirmation */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => {
          if (!actionLoading) setClearDialogOpen(false);
        }}
      >
        <DialogTitle>Clear all notifications?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all your notifications. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClearDialogOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={clearAllNotifications}
            disabled={actionLoading}
          >
            {actionLoading ? "Clearing..." : "Clear all"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Notifications;