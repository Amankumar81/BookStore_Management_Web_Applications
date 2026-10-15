const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Book = require("../models/Book");
const Coupon = require("../models/Coupon");
const QRCode = require("qrcode");
const Notification = require("../models/Notification");
const notifyAdmins = require("../utils/adminNotification");

// ============================================
// Safely Create Notification
// ============================================
const createNotificationSafely = async ({
  user,
  title,
  message,
  type,
  relatedOrder,
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
    console.error("NOTIFICATION CREATE ERROR:", error.message);
  }
};

// ============================================
// Allowed Order Statuses
// ============================================
const allowedStatuses = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

// ============================================
// Valid Order Status Transitions
// ============================================
const validTransitions = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

// ============================================
// Helper - Add Status History
// ============================================
const addStatusHistory = (
  order,
  status,
  updatedBy = null,
  note = ""
) => {
  if (!order.statusHistory) {
    order.statusHistory = [];
  }

  order.statusHistory.push({
    status,
    changedAt: new Date(),
    updatedBy,
    note,
  });
};

// ============================================
// Helper - Restore Stock
// ============================================
const restoreOrderStock = async (order) => {
  for (const item of order.orderItems) {
    await Book.findByIdAndUpdate(item.book, {
      $inc: {
        stock: item.quantity,
        sold: -item.quantity,
      },
    });
  }
};

// ============================================
// Helper - Calculate Coupon Discount
// ============================================
const calculateCouponDiscount = (coupon, subtotal) => {
  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (
      coupon.maximumDiscount !== undefined &&
      coupon.maximumDiscount !== null &&
      coupon.maximumDiscount > 0
    ) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.max(0, Math.min(discount, subtotal));

  return Math.round((discount + Number.EPSILON) * 100) / 100;
};

// ============================================
// Place Order
// POST /api/orders
//
// This endpoint now creates COD orders only.
// Online orders must use the payment checkout flow.
// ============================================
const placeOrder = async (req, res) => {
  let reserved = [];
  let couponUsageReserved = false;
  let couponId = null;

  const rollbackStock = async () => {
    for (const item of reserved) {
      await Book.findByIdAndUpdate(item.book._id, {
        $inc: {
          stock: item.quantity,
          sold: -item.quantity,
        },
      });
    }

    reserved = [];
  };

  const rollbackCouponUsage = async () => {
    if (couponUsageReserved && couponId) {
      await Coupon.findByIdAndUpdate(couponId, {
        $inc: {
          usedCount: -1,
        },
      });

      couponUsageReserved = false;
    }
  };

  try {
    const {
      shippingAddress,
      paymentMethod,
      couponCode,
    } = req.body;

    const selectedPaymentMethod = paymentMethod || "COD";

    if (!["COD", "Razorpay", "Stripe"].includes(selectedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    // Important: Do not create an online order before payment succeeds.
    if (selectedPaymentMethod !== "COD") {
      return res.status(400).json({
        success: false,
        message:
          "Online orders must be created through the secure payment checkout. No order has been placed.",
        code: "ONLINE_PAYMENT_REQUIRED",
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete shipping address is required",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.book");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    for (const item of cart.items) {
      if (!item.book) {
        return res.status(400).json({
          success: false,
          message: "One or more books in cart are no longer available",
        });
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "A cart item has an invalid quantity",
        });
      }
    }

    const subtotal = Math.max(
      0,
      Number(cart.totalPrice) || 0
    );

    let coupon = null;
    let discount = 0;
    let finalPrice = subtotal;

    // Validate coupon.
    if (
      typeof couponCode === "string" &&
      couponCode.trim()
    ) {
      const normalizedCode = couponCode.trim().toUpperCase();
      const now = new Date();

      coupon = await Coupon.findOne({
        code: normalizedCode,
        isActive: true,
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon is invalid or inactive",
        });
      }

      if (
        !coupon.expiresAt ||
        new Date(coupon.expiresAt) <= now
      ) {
        return res.status(400).json({
          success: false,
          message: "This coupon has expired",
        });
      }

      if (
        coupon.usageLimit !== undefined &&
        coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message: "Coupon usage limit has been reached",
        });
      }

      if (subtotal < (Number(coupon.minimumAmount) || 0)) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount for this coupon is ₹${coupon.minimumAmount}`,
        });
      }

      discount = calculateCouponDiscount(coupon, subtotal);
      finalPrice = Math.max(0, subtotal - discount);
    }

    // Reserve stock atomically for COD.
    for (const item of cart.items) {
      const updated = await Book.findOneAndUpdate(
        {
          _id: item.book._id,
          stock: {
            $gte: item.quantity,
          },
        },
        {
          $inc: {
            stock: -item.quantity,
            sold: item.quantity,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!updated) {
        await rollbackStock();

        return res.status(400).json({
          success: false,
          message: `${item.book.title} does not have enough stock`,
        });
      }

      reserved.push(item);
    }

    // Reserve coupon usage atomically for COD.
    if (coupon) {
      const now = new Date();

      const usageFilter = {
        _id: coupon._id,
        isActive: true,
        expiresAt: {
          $gt: now,
        },
      };

      if (
        coupon.usageLimit !== undefined &&
        coupon.usageLimit !== null
      ) {
        usageFilter.$expr = {
          $lt: ["$usedCount", "$usageLimit"],
        };
      }

      const updatedCoupon = await Coupon.findOneAndUpdate(
        usageFilter,
        {
          $inc: {
            usedCount: 1,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!updatedCoupon) {
        await rollbackStock();

        return res.status(400).json({
          success: false,
          message:
            "Coupon is expired, inactive, or its usage limit has been reached. Please apply another coupon.",
        });
      }

      couponUsageReserved = true;
      couponId = coupon._id;
    }

    const orderItems = cart.items.map((item) => ({
      book: item.book._id,
      quantity: item.quantity,
      price: item.price,
    }));

    let order;

    try {
      const now = new Date();

      const orderData = {
        user: req.user._id,
        orderItems,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || "India",
        },
        totalItems: cart.totalItems,
        subtotal,
        totalPrice: finalPrice,
        paymentMethod: "COD",
        paymentStatus: "Pending",
        orderStatus: "Pending",
        statusHistory: [
          {
            status: "Pending",
            changedAt: now,
            updatedBy: req.user._id,
            note: coupon
              ? `COD order placed with coupon ${coupon.code}`
              : "COD order placed successfully",
          },
        ],
        tracking: {
          carrier: "",
          trackingNumber: "",
          trackingUrl: "",
          shippedAt: null,
          estimatedDeliveryAt: null,
          deliveredAt: null,
        },
        delivery: {
          expectedDate: null,
          deliveredDate: null,
          receivedBy: "",
          deliveryNote: "",
          verified: false,
          verifiedAt: null,
        },
        processedAt: null,
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        paidAt: null,
      };

      if (coupon) {
        orderData.appliedCoupon = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discount,
        };
      }

      order = await Order.create(orderData);
    } catch (createError) {
      await rollbackStock();
      await rollbackCouponUsage();
      throw createError;
    }

    await notifyAdmins({
      title: "New COD Order Received",
      message: `A new COD order #${order._id} has been placed. Order total: ₹${Number(finalPrice).toFixed(2)}.`,
      type: "new_order",
      link: "/admin/orders",
      relatedOrder: order._id,
    });

    // Clear the customer's cart after successful COD order creation.
    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;

    try {
      await cart.save();
    } catch (cartError) {
      console.error(
        "ORDER CREATED, BUT CART CLEARING FAILED:",
        cartError.message
      );
    }

    await createNotificationSafely({
      user: req.user._id,
      title: "Order placed successfully",
      message: coupon
        ? `Your COD order #${order._id} has been placed successfully. Coupon ${coupon.code} saved you ₹${discount}.`
        : `Your COD order #${order._id} has been placed successfully.`,
      type: "order_placed",
      relatedOrder: order._id,
    });

    console.log("COD ORDER CREATED:", order._id);

    return res.status(201).json({
      success: true,
      message: coupon
        ? `COD order placed successfully. You saved ₹${discount} with coupon ${coupon.code}.`
        : "COD order placed successfully",
      order,
    });
  } catch (error) {
    console.error("PLACE ORDER ERROR:", error);

    try {
      await rollbackStock();
      await rollbackCouponUsage();
    } catch (rollbackError) {
      console.error("ORDER ROLLBACK ERROR:", rollbackError.message);
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Get My Orders
// GET /api/orders/my-orders
// ============================================
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .populate("orderItems.book", "title author image")
      .sort("-createdAt");

    return res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Get Single Order
// GET /api/orders/:id
// ============================================
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate(
        "orderItems.book",
        "title author image price discountPrice"
      )
      .populate("statusHistory.updatedBy", "name email role");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Cancel Order
// PUT /api/orders/:id/cancel
// ============================================
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }

    if (
      order.orderStatus === "Shipped" ||
      order.orderStatus === "Delivered" ||
      order.orderStatus === "Cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.orderStatus}`,
      });
    }

    // Never claim a refund happened without gateway confirmation.
    if (order.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message:
          "This order has been paid online. Process the gateway refund before cancellation can be completed.",
        code: "REFUND_REQUIRED",
      });
    }

    await restoreOrderStock(order);

    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();

    addStatusHistory(
      order,
      "Cancelled",
      req.user._id,
      "Order cancelled by customer"
    );

    await order.save();

    await createNotificationSafely({
      user: order.user,
      title: "Order cancelled",
      message: `Your order #${order._id} has been cancelled.`,
      type: "order_status_update",
      relatedOrder: order._id,
    });

    await notifyAdmins({
      title: "Order Cancelled",
      message: `Customer cancelled order #${order._id}.`,
      type: "system",
      link: "/admin/orders",
      relatedOrder: order._id,
    });

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate(
        "orderItems.book",
        "title author image price discountPrice"
      )
      .populate("statusHistory.updatedBy", "name email role");

    console.log("ORDER CANCELLED + STOCK RESTORED:", order._id);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully and stock restored",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Admin - Get All Orders
// GET /api/orders
// ============================================
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("orderItems.book", "title author image")
      .populate("statusHistory.updatedBy", "name email role")
      .sort("-createdAt");

    return res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Admin - Update Order Status
// PUT /api/orders/:id/status
// ============================================
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, note = "" } = req.body;

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: "orderStatus is required",
      });
    }

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === orderStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already ${orderStatus}`,
      });
    }

    if (
      !validTransitions[order.orderStatus] ||
      !validTransitions[order.orderStatus].includes(orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: `Order cannot move from ${order.orderStatus} to ${orderStatus}`,
      });
    }

    if (orderStatus === "Cancelled") {
      // Refund first; never label a paid order as refunded automatically.
      if (order.paymentStatus === "Paid") {
        return res.status(400).json({
          success: false,
          message:
            "This order has a successful payment. Process the gateway refund before cancelling the order.",
          code: "REFUND_REQUIRED",
        });
      }

      await restoreOrderStock(order);
      order.cancelledAt = new Date();
    }

    if (orderStatus === "Processing") {
      order.processedAt = new Date();
    }

    if (orderStatus === "Shipped") {
      const shippedAt = new Date();

      order.shippedAt = shippedAt;

      if (!order.tracking) {
        order.tracking = {};
      }

      order.tracking.shippedAt = shippedAt;

      if (!order.tracking.estimatedDeliveryAt) {
        const estimatedDelivery = new Date(shippedAt);
        estimatedDelivery.setDate(
          estimatedDelivery.getDate() + 5
        );

        order.tracking.estimatedDeliveryAt = estimatedDelivery;

        if (!order.delivery) {
          order.delivery = {};
        }

        order.delivery.expectedDate = estimatedDelivery;
      }
    }

    if (orderStatus === "Delivered") {
      const deliveredAt = new Date();

      order.deliveredAt = deliveredAt;

      if (!order.tracking) {
        order.tracking = {};
      }

      order.tracking.deliveredAt = deliveredAt;

      if (!order.delivery) {
        order.delivery = {};
      }

      order.delivery.deliveredDate = deliveredAt;
    }

    order.orderStatus = orderStatus;

    addStatusHistory(order, orderStatus, req.user._id, note);

    await order.save();

    await createNotificationSafely({
      user: order.user,
      title: `Order ${orderStatus}`,
      message: `Your order #${order._id} status is now ${orderStatus}.${note ? ` Note: ${note}` : ""}`,
      type: "order_status_update",
      relatedOrder: order._id,
    });

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate(
        "orderItems.book",
        "title author image price discountPrice"
      )
      .populate("statusHistory.updatedBy", "name email role");

    console.log(
      `ORDER STATUS UPDATED: ${order._id} -> ${orderStatus}`
    );

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Admin - Update Tracking Information
// PUT /api/orders/:id/tracking
// ============================================
const updateOrderTracking = async (req, res) => {
  try {
    const {
      carrier,
      trackingNumber,
      trackingUrl,
      estimatedDeliveryAt,
    } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.tracking) {
      order.tracking = {};
    }

    const changes = [];

    if (carrier !== undefined) {
      const nextCarrier = String(carrier).trim();

      if (order.tracking.carrier !== nextCarrier) {
        order.tracking.carrier = nextCarrier;
        changes.push("shipping carrier");
      }
    }

    if (trackingNumber !== undefined) {
      const nextTrackingNumber = String(trackingNumber).trim();

      if (order.tracking.trackingNumber !== nextTrackingNumber) {
        order.tracking.trackingNumber = nextTrackingNumber;
        changes.push("tracking number");
      }
    }

    if (trackingUrl !== undefined) {
      const nextTrackingUrl = String(trackingUrl).trim();

      if (order.tracking.trackingUrl !== nextTrackingUrl) {
        order.tracking.trackingUrl = nextTrackingUrl;
        changes.push("tracking link");
      }
    }

    if (estimatedDeliveryAt !== undefined) {
      const estimatedDate = new Date(estimatedDeliveryAt);

      if (Number.isNaN(estimatedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid estimated delivery date",
        });
      }

      const oldEstimatedDate =
        order.tracking.estimatedDeliveryAt
          ? new Date(order.tracking.estimatedDeliveryAt)
          : null;

      const dateChanged =
        !oldEstimatedDate ||
        oldEstimatedDate.getTime() !== estimatedDate.getTime();

      if (dateChanged) {
        order.tracking.estimatedDeliveryAt = estimatedDate;

        if (!order.delivery) {
          order.delivery = {};
        }

        order.delivery.expectedDate = estimatedDate;
        changes.push("estimated delivery date");
      }
    }

    await order.save();

    if (changes.length > 0) {
      const details = [];

      if (order.tracking.carrier) {
        details.push(`Carrier: ${order.tracking.carrier}`);
      }

      if (order.tracking.trackingNumber) {
        details.push(
          `Tracking number: ${order.tracking.trackingNumber}`
        );
      }

      if (order.tracking.estimatedDeliveryAt) {
        details.push(
          `Estimated delivery: ${new Date(
            order.tracking.estimatedDeliveryAt
          ).toLocaleDateString("en-IN")}`
        );
      }

      await createNotificationSafely({
        user: order.user,
        title: "Order Tracking Updated",
        message:
          `Tracking information for order #${order._id} has been updated (${changes.join(", ")}).` +
          (details.length ? ` ${details.join(". ")}.` : ""),
        type: "order_status_update",
        relatedOrder: order._id,
      });
    }

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("orderItems.book", "title author image");

    return res.status(200).json({
      success: true,
      message: "Tracking information updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("UPDATE TRACKING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Admin - Update Delivery Information
// PUT /api/orders/:id/delivery
// ============================================
const updateDeliveryInformation = async (req, res) => {
  try {
    const { receivedBy, deliveryNote, verified } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.delivery) {
      order.delivery = {};
    }

    const changes = [];

    if (receivedBy !== undefined) {
      const nextReceivedBy = String(receivedBy).trim();

      if (order.delivery.receivedBy !== nextReceivedBy) {
        order.delivery.receivedBy = nextReceivedBy;
        changes.push("recipient information");
      }
    }

    if (deliveryNote !== undefined) {
      const nextDeliveryNote = String(deliveryNote).trim();

      if (order.delivery.deliveryNote !== nextDeliveryNote) {
        order.delivery.deliveryNote = nextDeliveryNote;
        changes.push("delivery note");
      }
    }

    if (verified !== undefined) {
      if (typeof verified !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "The verified field must be true or false",
        });
      }

      if (order.delivery.verified !== verified) {
        order.delivery.verified = verified;
        order.delivery.verifiedAt = verified
          ? new Date()
          : null;

        changes.push(
          verified
            ? "delivery verification"
            : "delivery verification status"
        );
      }
    }

    await order.save();

    if (changes.length > 0) {
      await createNotificationSafely({
        user: order.user,
        title: "Delivery Information Updated",
        message:
          `Delivery information for order #${order._id} has been updated (${changes.join(", ")}).` +
          (order.delivery.receivedBy
            ? ` Received by: ${order.delivery.receivedBy}.`
            : "") +
          (order.delivery.deliveryNote
            ? ` Note: ${order.delivery.deliveryNote}`
            : ""),
        type: "order_status_update",
        relatedOrder: order._id,
      });
    }

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("orderItems.book", "title author image");

    return res.status(200).json({
      success: true,
      message: "Delivery information updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("UPDATE DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Admin - Verify Delivery
// PUT /api/orders/:id/delivery/verify
// ============================================
const verifyDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message:
          "Order must be Delivered before delivery verification",
      });
    }

    if (!order.delivery) {
      order.delivery = {};
    }

    const wasAlreadyVerified = order.delivery.verified === true;

    order.delivery.verified = true;
    order.delivery.verifiedAt =
      order.delivery.verifiedAt || new Date();

    if (!order.delivery.deliveredDate) {
      order.delivery.deliveredDate =
        order.deliveredAt || new Date();
    }

    await order.save();

    if (!wasAlreadyVerified) {
      await createNotificationSafely({
        user: order.user,
        title: "Delivery Verified",
        message:
          `Delivery for order #${order._id} has been verified successfully.`,
        type: "order_status_update",
        relatedOrder: order._id,
      });
    }

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("orderItems.book", "title author image");

    return res.status(200).json({
      success: true,
      message: "Delivery verified successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("VERIFY DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Generate Order QR
// GET /api/orders/:id/qr
// ============================================
const generateOrderQR = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order QR",
      });
    }

    const qrData = order._id.toString();
    const qrCode = await QRCode.toDataURL(qrData);

    return res.status(200).json({
      success: true,
      orderId: order._id,
      qrCode,
    });
  } catch (error) {
    console.error("QR GENERATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate QR code",
    });
  }
};

// ============================================
// Exports
// ============================================
module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  updateDeliveryInformation,
  verifyDelivery,
  generateOrderQR,
};