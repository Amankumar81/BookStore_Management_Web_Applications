
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    type: {
      type: String,
      required: true,
      enum: [
        // Existing customer notifications
        "order_placed",
        "order_status_update",
        "delivery_reminder",
        "return_request",
        "return_status_update",
        "refund_update",
        "system",

        // Admin notifications
        "new_order",
        "new_return",
        "new_customer",
        "coupon_update",
        "inventory_alert",
      ],
      default: "system",
    },

    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // Internal frontend route, such as /admin/orders
    link: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
