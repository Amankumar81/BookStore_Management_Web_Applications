import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
} from "@mui/material";

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CircleIcon from "@mui/icons-material/Circle";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";
const MAX_VISIBLE_NOTIFICATIONS = 20;

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

const getNotificationLink = (notification) => {
  if (notification.link?.startsWith("/admin")) {
    return notification.link;
  }

  switch (notification.type) {
    case "new_order":
      return "/admin/orders";

    case "new_return":
    case "return_request":
      return "/admin/returns";

    case "new_customer":
      return "/admin/customers";

    case "coupon_update":
      return "/admin/coupons";

    case "inventory_alert":
      return "/admin/books";

    default:
      return "/admin";
  }
};

const formatNotificationDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AdminNotificationBell() {
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const open = Boolean(anchorEl);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Your login session is missing. Please log in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/unread-count`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await getResponseData(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to fetch unread notifications."
        );
      }

      const count = Number(data.unreadCount ?? data.count ?? 0);

      setUnreadCount(
        Number.isFinite(count) ? Math.max(0, count) : 0
      );
    } catch (err) {
      console.error("Unread notification count error:", err);
    }
  }, [getAuthHeaders]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    setActionError("");

    try {
      const headers = getAuthHeaders();

      const [listResponse, countResponse] = await Promise.all([
        fetch(`${API_URL}/api/notifications`, { headers }),
        fetch(`${API_URL}/api/notifications/unread-count`, {
          headers,
        }),
      ]);

      const [listData, countData] = await Promise.all([
        getResponseData(listResponse),
        getResponseData(countResponse),
      ]);

      if (!listResponse.ok || listData.success === false) {
        throw new Error(
          listData.message ||
            `Unable to fetch notifications (${listResponse.status}).`
        );
      }

      if (!countResponse.ok || countData.success === false) {
        throw new Error(
          countData.message || "Unable to fetch unread count."
        );
      }

      const list = Array.isArray(listData.notifications)
        ? listData.notifications
        : [];

      const count = Number(
        countData.unreadCount ?? countData.count ?? 0
      );

      setNotifications(list);
      setUnreadCount(
        Number.isFinite(count) ? Math.max(0, count) : 0
      );
    } catch (err) {
      console.error("Admin notifications error:", err);
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUnreadCount();

    const intervalId = window.setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [fetchUnreadCount]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Mark as read, remove from dropdown immediately, and update the badge.
  const markAsRead = async (notificationId) => {
    setActionError("");

    const selectedNotification = notifications.find(
      (item) => item._id === notificationId
    );

    if (!selectedNotification) {
      return true;
    }

    if (selectedNotification.isRead) {
      setNotifications((current) =>
        current.filter((item) => item._id !== notificationId)
      );

      return true;
    }

    // Optimistic UI update.
    setNotifications((current) =>
      current.filter((item) => item._id !== notificationId)
    );

    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      const data = await getResponseData(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to mark notification as read."
        );
      }

      // Use the authoritative count returned by the backend when available.
      if (data.unreadCount !== undefined) {
        const count = Number(data.unreadCount);

        if (Number.isFinite(count)) {
          setUnreadCount(Math.max(0, count));
        }
      }

      return true;
    } catch (err) {
      console.error("Mark notification as read error:", err);

      // Restore the notification if the backend update failed.
      setNotifications((current) => {
        if (current.some((item) => item._id === notificationId)) {
          return current;
        }

        return [selectedNotification, ...current].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );
      });

      setUnreadCount((current) => current + 1);

      setActionError(
        err.message || "Unable to mark notification as read."
      );

      return false;
    }
  };

  // Mark every notification as read.
  const markAllAsRead = async () => {
    setActionError("");

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    // Hide read notifications immediately.
    setNotifications([]);
    setUnreadCount(0);

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      const data = await getResponseData(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to mark all notifications as read."
        );
      }

      if (data.unreadCount !== undefined) {
        const count = Number(data.unreadCount);

        if (Number.isFinite(count)) {
          setUnreadCount(Math.max(0, count));
        }
      }
    } catch (err) {
      console.error("Mark all notifications as read error:", err);

      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);

      setActionError(
        err.message || "Unable to mark all notifications as read."
      );
    }
  };

  const handleNotificationClick = async (notification) => {
    const saved = await markAsRead(notification._id);

    if (!saved) {
      return;
    }

    handleClose();
    navigate(getNotificationLink(notification));
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          aria-label={`${unreadCount} unread notifications`}
          onClick={handleOpen}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            overlap="circular"
            invisible={unreadCount === 0}
          >
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 390 },
              maxWidth: "calc(100vw - 24px)",
              maxHeight: 520,
              mt: 1,
              borderRadius: 2,
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box>
            <Typography fontWeight="bold">
              Notifications
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {unreadCount} unread
            </Typography>
          </Box>

          <Tooltip title="Mark all as read">
            <span>
              <IconButton
                size="small"
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
                aria-label="Mark all notifications as read"
              >
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Divider />

        {actionError && (
          <Alert severity="error" sx={{ m: 1 }}>
            {actionError}
          </Alert>
        )}

        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              p: 3,
            }}
          >
            <CircularProgress size={26} />
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>

            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={fetchNotifications}
            >
              Try again
            </Button>
          </Box>
        )}

        {!loading && !error && notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsNoneIcon
              sx={{ fontSize: 36, color: "text.secondary" }}
            />

            <Typography fontWeight={600}>
              You're all caught up
            </Typography>

            <Typography variant="body2" color="text.secondary">
              New notifications will appear here.
            </Typography>
          </Box>
        )}

        {!loading && !error && notifications.length > 0 && (
          <List disablePadding>
            {notifications
              .slice(0, MAX_VISIBLE_NOTIFICATIONS)
              .map((notification) => (
                <ListItem key={notification._id} disablePadding>
                  <ListItemButton
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                    sx={{
                      alignItems: "flex-start",
                      py: 1.5,
                      px: 2,
                      gap: 1.25,
                      bgcolor: notification.isRead
                        ? "transparent"
                        : "action.hover",
                    }}
                  >
                    <CircleIcon
                      sx={{
                        fontSize: 9,
                        mt: 1,
                        flexShrink: 0,
                        color: notification.isRead
                          ? "transparent"
                          : "primary.main",
                      }}
                    />

                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={notification.isRead ? 400 : 700}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              overflowWrap: "anywhere",
                              mt: 0.5,
                            }}
                          >
                            {notification.message}
                          </Typography>

                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 0.75,
                            }}
                          >
                            {formatNotificationDate(
                              notification.createdAt
                            )}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>
        )}

        <Divider />

        <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
          <Button
            fullWidth
            size="small"
            onClick={fetchNotifications}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => {
              handleClose();
              navigate("/admin/returns");
            }}
          >
            Manage Returns
          </Button>
        </Box>
      </Menu>
    </>
  );
}

export default AdminNotificationBell;