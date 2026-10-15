
const mongoose = require("mongoose");

const Return = require("../models/Return");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const notifyAdmins = require("../utils/adminNotification");

const RETURN_WINDOW_DAYS = 5;
const RETURN_WINDOW_MS =
  RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const ALLOWED_REASONS = [
  "Damaged item",
  "Wrong item received",
  "Item not as described",
  "Missing items",
  "Other",
];

const RETURN_STATUSES = [
  "Requested",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Item Received",
  "Refund Processing",
  "Refunded",
  "Completed",
  "Cancelled",
];

// ============================================
// Safely create customer notification
// ============================================

const createReturnNotificationSafely = async ({
  user,
  title,
  message,
  type = "return_status_update",
  relatedOrder = null,
}) => {
  try {
    await Notification.create({
      user,
      title,
      message,
      type,
      relatedOrder,
    });
  } catch (error) {
    console.error(
      "RETURN NOTIFICATION CREATION ERROR:",
      error.message
    );
  }
};

// ============================================
// Return-window helpers
// ============================================

const getDeliveryDate = (order) => {
  const candidates = [
    order.deliveredAt,
    order.tracking?.deliveredAt,
    order.delivery?.deliveredDate,
    ...(order.statusHistory || [])
      .filter((entry) => entry.status === "Delivered")
      .map((entry) => entry.changedAt),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const date = new Date(candidate);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

const getReturnWindow = (order) => {
  const deliveredAt = getDeliveryDate(order);

  if (!deliveredAt) {
    return {
      eligible: false,
      deliveredAt: null,
      deadline: null,
      message:
        "The delivery date is missing for this order. Please contact support to verify delivery before requesting a return.",
    };
  }

  const deadline = new Date(
    deliveredAt.getTime() + RETURN_WINDOW_MS
  );

  const eligible = Date.now() <= deadline.getTime();

  return {
    eligible,
    deliveredAt,
    deadline,
    message: eligible
      ? ""
      : "The 5-day return window has expired for this order.",
  };
};

// ============================================
// POST /api/returns
// Customer creates a return request
// ============================================

const createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, reason, description } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid order ID.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one item to return.",
      });
    }

    if (!ALLOWED_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid return reason.",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" ||
        description.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must not exceed 1000 characters.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).populate("orderItems.book", "title author image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned.",
      });
    }

    const returnWindow = getReturnWindow(order);

    if (!returnWindow.eligible) {
      return res.status(400).json({
        success: false,
        message: returnWindow.message,
        deliveredAt: returnWindow.deliveredAt,
        returnDeadline: returnWindow.deadline,
      });
    }

    const purchasedItems = order.orderItems;

    if (
      !Array.isArray(purchasedItems) ||
      purchasedItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No purchased items were found for this order.",
      });
    }

    const requestedQuantities = new Map();

    for (const item of items) {
      const rawBookId = item?.bookId || item?.book;

      const bookId =
        rawBookId && typeof rawBookId === "object"
          ? rawBookId._id
          : rawBookId;

      const quantity = Number(item?.quantity);

      if (
        !mongoose.isValidObjectId(bookId) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each return item must have a valid book ID and quantity.",
        });
      }

      const normalizedBookId = String(bookId);

      requestedQuantities.set(
        normalizedBookId,
        (requestedQuantities.get(normalizedBookId) || 0) +
          quantity
      );
    }

    const normalizedItems = [];

    for (const [bookId, quantity] of requestedQuantities) {
      const purchasedItem = purchasedItems.find(
        (orderItem) => {
          const purchasedBookId =
            orderItem.book?._id || orderItem.book;

          return (
            purchasedBookId &&
            String(purchasedBookId) === bookId
          );
        }
      );

      if (!purchasedItem) {
        return res.status(400).json({
          success: false,
          message:
            "A selected book does not belong to this order.",
        });
      }

      const purchasedBookId =
        purchasedItem.book?._id || purchasedItem.book;

      const purchasedQuantity = Number(purchasedItem.quantity);
      const purchasedPrice = Number(purchasedItem.price);

      if (
        !Number.isInteger(purchasedQuantity) ||
        purchasedQuantity < 1 ||
        !Number.isFinite(purchasedPrice) ||
        purchasedPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The purchased item has invalid quantity or price data.",
        });
      }

      if (quantity > purchasedQuantity) {
        return res.status(400).json({
          success: false,
          message:
            "Return quantity exceeds the purchased quantity.",
        });
      }

      const existingReturns = await Return.find({
        order: order._id,
        user: req.user._id,
        status: { $nin: ["Rejected", "Cancelled"] },
        "items.book": purchasedBookId,
      }).lean();

      const alreadyRequested = existingReturns.reduce(
        (total, returnRequest) =>
          total +
          (returnRequest.items || []).reduce(
            (itemTotal, returnItem) =>
              String(returnItem.book) === bookId
                ? itemTotal +
                  Number(returnItem.quantity || 0)
                : itemTotal,
            0
          ),
        0
      );

      if (alreadyRequested + quantity > purchasedQuantity) {
        return res.status(409).json({
          success: false,
          message:
            "Some of this book's quantity is already included in another return request.",
        });
      }

      normalizedItems.push({
        book: purchasedBookId,
        title: purchasedItem.book?.title || "Book",
        quantity,
        price: purchasedPrice,
      });
    }

    const refundAmount = normalizedItems.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );

    const returnRequest = await Return.create({
      order: order._id,
      user: req.user._id,
      items: normalizedItems,
      reason,
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      refundAmount,
    });

    // Existing customer notification
    await createReturnNotificationSafely({
      user: req.user._id,
      title: "Return Request Submitted",
      message: `Your return request for order #${order._id} has been submitted and is awaiting review.`,
      type: "return_request",
      relatedOrder: order._id,
    });

    // New admin notification
    await notifyAdmins({
      title: "New Return Request",
      message: `A customer submitted a return request for order #${order._id}. Reason: ${reason}. Requested refund: ₹${refundAmount.toFixed(2)}.`,
      type: "new_return",
      link: "/admin/returns",
      relatedOrder: order._id,
    });

    return res.status(201).json({
      success: true,
      message: "Return request submitted successfully.",
      returnRequest,
    });
  } catch (error) {
    console.error("CREATE RETURN REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create return request.",
    });
  }
};

// ============================================
// GET /api/returns/my
// Customer views their own return requests
// ============================================

const getMyReturns = async (req, res) => {
  try {
    const returnRequests = await Return.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate(
        "order",
        "_id orderStatus status createdAt deliveredAt tracking delivery statusHistory"
      )
      .populate("items.book", "title author image")
      .lean();

    return res.status(200).json({
      success: true,
      count: returnRequests.length,
      returnRequests,
    });
  } catch (error) {
    console.error("GET MY RETURNS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your return requests.",
    });
  }
};

// ============================================
// GET /api/returns/:id
// Customer views one of their own requests
// ============================================

const getMyReturnById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return request ID.",
      });
    }

    const returnRequest = await Return.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate(
        "order",
        "_id orderStatus status createdAt deliveredAt tracking delivery statusHistory"
      )
      .populate("items.book", "title author image")
      .lean();

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    console.error("GET RETURN BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch return request.",
    });
  }
};

// ============================================
// PATCH /api/returns/:id/cancel
// Customer cancels a pending request
// ============================================

const cancelMyReturn = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return request ID.",
      });
    }

    const returnRequest = await Return.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
    }

    if (returnRequest.status !== "Requested") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending return requests can be cancelled.",
      });
    }

    returnRequest.status = "Cancelled";
    await returnRequest.save();

    await createReturnNotificationSafely({
      user: req.user._id,
      title: "Return Request Cancelled",
      message: `Your return request for order #${returnRequest.order} has been cancelled.`,
      type: "return_status_update",
      relatedOrder: returnRequest.order,
    });

    // Notify admins that the request was withdrawn.
    await notifyAdmins({
      title: "Return Request Cancelled",
      message: `A customer cancelled a return request for order #${returnRequest.order}.`,
      type: "new_return",
      link: "/admin/returns",
      relatedOrder: returnRequest.order,
    });

    return res.status(200).json({
      success: true,
      message: "Return request cancelled successfully.",
      returnRequest,
    });
  } catch (error) {
    console.error("CANCEL RETURN REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel return request.",
    });
  }
};

// ============================================
// GET /api/returns/admin/all
// Admin views all return requests
// ============================================

const getAllReturns = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    const filter = {};

    if (req.query.status) {
      if (!RETURN_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid return status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const [returnRequests, total] = await Promise.all([
      Return.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email")
        .populate(
          "order",
          "_id orderStatus createdAt totalPrice"
        )
        .populate("items.book", "title author image")
        .lean(),

      Return.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: returnRequests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      returnRequests,
    });
  } catch (error) {
    console.error("ADMIN GET ALL RETURNS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch return requests.",
    });
  }
};

// ============================================
// GET /api/returns/admin/:id
// Admin views a single return request
// ============================================

const getAdminReturnById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return request ID.",
      });
    }

    const returnRequest = await Return.findById(req.params.id)
      .populate("user", "name email")
      .populate(
        "order",
        "_id orderStatus createdAt totalPrice orderItems"
      )
      .populate("items.book", "title author image")
      .lean();

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    console.error("ADMIN GET RETURN BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch return request details.",
    });
  }
};

// ============================================
// PATCH /api/returns/admin/:id/review
// Admin approves or rejects a request
// ============================================

const reviewReturnRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return request ID.",
      });
    }

    const { status, adminNote } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Review status must be either "Approved" or "Rejected".',
      });
    }

    if (
      adminNote !== undefined &&
      (typeof adminNote !== "string" ||
        adminNote.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin note must not exceed 1000 characters.",
      });
    }

    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
    }

    if (returnRequest.status !== "Requested") {
      return res.status(400).json({
        success: false,
        message:
          "Only requested returns can be approved or rejected.",
      });
    }

    returnRequest.status = status;
    returnRequest.adminNote =
      typeof adminNote === "string"
        ? adminNote.trim()
        : "";
    returnRequest.reviewedAt = new Date();

    await returnRequest.save();

    const reviewMessage =
      status === "Approved"
        ? "Your return request has been approved."
        : "Your return request has been rejected.";

    await createReturnNotificationSafely({
      user: returnRequest.user,
      title:
        status === "Approved"
          ? "Return Request Approved"
          : "Return Request Rejected",
      message: returnRequest.adminNote
        ? `${reviewMessage} Admin note: ${returnRequest.adminNote}`
        : reviewMessage,
      type: "return_status_update",
      relatedOrder: returnRequest.order,
    });

    return res.status(200).json({
      success: true,
      message:
        status === "Approved"
          ? "Return request approved successfully."
          : "Return request rejected successfully.",
      returnRequest,
    });
  } catch (error) {
    console.error("ADMIN REVIEW RETURN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review return request.",
    });
  }
};

// ============================================
// PATCH /api/returns/admin/:id/status
// Admin moves a return through its workflow
// ============================================

const RETURN_TRANSITIONS = {
  Approved: ["Pickup Scheduled"],
  "Pickup Scheduled": ["Item Received"],
  "Item Received": ["Refund Processing"],
  "Refund Processing": ["Refunded"],
  Refunded: ["Completed"],
};

const getReturnStatusNotification = (status) => {
  const notifications = {
    "Pickup Scheduled": {
      title: "Return Pickup Scheduled",
      message:
        "A pickup has been scheduled for your return. Please check your return details for further information.",
      type: "return_status_update",
    },

    "Item Received": {
      title: "Returned Item Received",
      message:
        "Your returned item has been received. The next step in the return process can now begin.",
      type: "return_status_update",
    },

    "Refund Processing": {
      title: "Refund Processing Started",
      message:
        "Your return has reached the refund-processing stage. This does not mean the payment has already been transferred.",
      type: "refund_update",
    },

    Refunded: {
      title: "Refund Marked as Refunded",
      message:
        "Your return has been marked as refunded. Please note that this status alone does not verify a successful payment-gateway transfer.",
      type: "refund_update",
    },

    Completed: {
      title: "Return Completed",
      message:
        "Your return request has been marked as completed.",
      type: "refund_update",
    },
  };

  return notifications[status] || null;
};

const updateReturnStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return request ID.",
      });
    }

    const { status, adminNote } = req.body;

    if (!RETURN_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid return status.",
      });
    }

    if (
      adminNote !== undefined &&
      (typeof adminNote !== "string" ||
        adminNote.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin note must not exceed 1000 characters.",
      });
    }

    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
    }

    const allowedNextStatuses =
      RETURN_TRANSITIONS[returnRequest.status] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot change return status from "${returnRequest.status}" to "${status}".`,
        allowedNextStatuses,
      });
    }

    returnRequest.status = status;

    if (typeof adminNote === "string") {
      returnRequest.adminNote = adminNote.trim();
    }

    if (status === "Completed") {
      returnRequest.completedAt = new Date();
    }

    await returnRequest.save();

    const notificationDetails =
      getReturnStatusNotification(status);

    if (notificationDetails) {
      const noteMessage =
        typeof adminNote === "string" &&
        adminNote.trim()
          ? ` Admin note: ${adminNote.trim()}`
          : "";

      await createReturnNotificationSafely({
        user: returnRequest.user,
        title: notificationDetails.title,
        message:
          `${notificationDetails.message}${noteMessage}`,
        type: notificationDetails.type,
        relatedOrder: returnRequest.order,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Return status updated to "${status}".`,
      returnRequest,
    });
  } catch (error) {
    console.error("ADMIN UPDATE RETURN STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update return status.",
    });
  }
};

// ============================================
// Controller exports
// ============================================

module.exports = {
  createReturnRequest,
  getMyReturns,
  getMyReturnById,
  cancelMyReturn,
  getAllReturns,
  getAdminReturnById,
  reviewReturnRequest,
  updateReturnStatus,
};
