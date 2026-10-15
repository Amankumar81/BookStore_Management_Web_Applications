const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notification.controller");

router.use(protect);

// Get notifications
router.get("/", getMyNotifications);

// Get unread count
router.get("/unread-count", getUnreadNotificationCount);

// Mark notifications as read
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

// Delete routes — keep clear-all before /:id
router.delete("/clear-all", clearAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;