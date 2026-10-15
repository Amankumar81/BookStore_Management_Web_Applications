
const User = require("../models/User");
const Notification = require("../models/Notification");

const notifyAdmins = async ({
  title,
  message,
  type = "system",
  link = "/admin",
  relatedOrder = null,
}) => {
  try {
    // Find all admins who are not blocked.
    // This also allows admins whose isBlocked field is missing.
    const admins = await User.find({
      role: "admin",
      isBlocked: { $ne: true },
    }).select("_id");

    if (admins.length === 0) {
      console.warn(
        "ADMIN NOTIFICATION: No unblocked admin users found."
      );

      return {
        success: false,
        createdCount: 0,
        message: "No unblocked admin users found.",
      };
    }

    // Create one unread notification for each admin.
    const notifications = admins.map((admin) => ({
      user: admin._id,
      title,
      message,
      type,
      link,
      relatedOrder,
      isRead: false,
      readAt: null,
    }));

    const createdNotifications =
      await Notification.insertMany(notifications);

    console.log(
      `ADMIN NOTIFICATION CREATED: ${createdNotifications.length} notification(s).`,
      title
    );

    return {
      success: true,
      createdCount: createdNotifications.length,
    };
  } catch (error) {
    console.error(
      "ADMIN NOTIFICATION ERROR:",
      error.message
    );

    return {
      success: false,
      createdCount: 0,
      message: error.message,
    };
  }
};

module.exports = notifyAdmins;
