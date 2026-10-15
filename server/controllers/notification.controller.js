const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// ============================================
// GET /api/notifications
// Get notifications for the logged-in user
// ============================================
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate("relatedOrder", "_id status orderStatus")
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

// ============================================
// GET /api/notifications/unread-count
// Get unread notification count
// ============================================
const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("UNREAD NOTIFICATION COUNT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count.",
    });
  }
};

// ============================================
// PATCH /api/notifications/:id/read
// Mark one notification as read
// ============================================
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error("MARK NOTIFICATION READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

// ============================================
// PATCH /api/notifications/read-all
// Mark all notifications as read
// ============================================
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        user: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
      unreadCount,
    });
  } catch (error) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
};

// ============================================
// DELETE /api/notifications/:id
// Delete one notification belonging to the user
// ============================================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
      notificationId: notification._id,
      unreadCount,
    });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

// ============================================
// DELETE /api/notifications/clear-all
// Delete all notifications belonging to the user
// ============================================
const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications cleared successfully.",
      deletedCount: result.deletedCount,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("CLEAR ALL NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications.",
    });
  }
};

// ============================================
// Exports
// ============================================
module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
};
