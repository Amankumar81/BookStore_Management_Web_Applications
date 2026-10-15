const mongoose = require("mongoose");

// ============================================
// Order Item Schema
// ============================================
const orderItemSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// ============================================
// Shipping Address Schema
// ============================================
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
  },
  { _id: false }
);

// ============================================
// Order Status History Schema
// ============================================
const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: true }
);

// ============================================
// Tracking Information Schema
// ============================================
const trackingSchema = new mongoose.Schema(
  {
    carrier: { type: String, trim: true, default: "" },
    trackingNumber: { type: String, trim: true, default: "" },
    trackingUrl: { type: String, trim: true, default: "" },
    shippedAt: { type: Date, default: null },
    estimatedDeliveryAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false }
);

// ============================================
// Delivery Information Schema
// ============================================
const deliverySchema = new mongoose.Schema(
  {
    expectedDate: { type: Date, default: null },
    deliveredDate: { type: Date, default: null },
    receivedBy: { type: String, trim: true, default: "" },
    deliveryNote: { type: String, trim: true, default: "" },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ============================================
// Applied Coupon Schema
// ============================================
const appliedCouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: null,
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

// ============================================
// Order Schema
// ============================================
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Order must contain at least one item.",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    // ============================================
    // Order Totals
    // ============================================
    totalItems: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Subtotal before coupon discount
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    appliedCoupon: {
      type: appliedCouponSchema,
      default: () => ({}),
    },

    // Final amount payable after coupon discount
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // ============================================
    // Payment
    // ============================================
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay", "Stripe"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paidAt: { type: Date, default: null },

    // ============================================
    // Order Status
    // ============================================
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },

    statusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },

    tracking: {
      type: trackingSchema,
      default: () => ({}),
    },

    delivery: {
      type: deliverySchema,
      default: () => ({}),
    },

    processedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ============================================
// Indexes
// ============================================
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ "tracking.trackingNumber": 1 });

// ============================================
// Export Model
// ============================================
module.exports = mongoose.model("Order", orderSchema);
