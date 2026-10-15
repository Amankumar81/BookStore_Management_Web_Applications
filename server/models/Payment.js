const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Customer who initiated the payment.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional until payment succeeds and the order is created.
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    // Razorpay gateway identifiers.
    razorpayOrderId: {
      type: String,
      default: "",
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
      index: true,
    },

    razorpaySignature: {
      type: String,
      default: "",
      select: false,
    },

    razorpayRefundId: {
      type: String,
      default: "",
      index: true,
    },

    // Internal reference to help identify repeated checkout attempts.
    idempotencyKey: {
      type: String,
      default: undefined,
      trim: true,
    },

    // Amount is stored in INR, not paise.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["ONLINE", "COD"],
      default: "ONLINE",
    },

    gatewayMethod: {
      type: String,
      default: "",
      trim: true,
    },

    // Overall payment lifecycle.
    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Authorized",
        "Paid",
        "Failed",
        "Refund Pending",
        "Partially Refunded",
        "Refunded",
      ],
      default: "Pending",
      index: true,
    },

    // Refund lifecycle is tracked separately from payment status.
    refundStatus: {
      type: String,
      enum: [
        "Not Required",
        "Pending",
        "Processing",
        "Processed",
        "Failed",
      ],
      default: "Not Required",
      index: true,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    refundFailureReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    gatewayPaymentStatus: {
      type: String,
      default: "",
      trim: true,
    },

    transactionId: {
      type: String,
      default: "",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    refundInitiatedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    // Used to reconcile delayed or uncertain gateway responses.
    lastVerifiedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes for customer history and admin payment reports.
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1, createdAt: -1 });
paymentSchema.index({ refundStatus: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);