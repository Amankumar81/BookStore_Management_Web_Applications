const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // =========================================
    // COUPON CODE
    // =========================================

    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    // =========================================
    // DISCOUNT TYPE
    // =========================================

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },

    // =========================================
    // DISCOUNT VALUE
    // =========================================

    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount value must be at least 1"],
    },

    // =========================================
    // MINIMUM ORDER AMOUNT
    // =========================================

    minimumAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum amount cannot be negative"],
    },

    // =========================================
    // MAXIMUM DISCOUNT
    // Mainly useful for percentage coupons
    // =========================================

    maximumDiscount: {
      type: Number,
      default: null,
      min: 0,
    },

    // =========================================
    // EXPIRY
    // =========================================

    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },

    // =========================================
    // USAGE LIMIT
    // =========================================

    usageLimit: {
      type: Number,
      default: 100,
      min: [1, "Usage limit must be at least 1"],
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================
    // STATUS
    // =========================================

    isActive: {
      type: Boolean,
      default: true,
    },

    // =========================================
    // CREATED BY ADMIN
    // =========================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================
// VALIDATION
// =========================================

couponSchema.pre("validate", function () {
  // Percentage cannot exceed 100
  if (
    this.discountType === "percentage" &&
    this.discountValue > 100
  ) {
    throw new Error(
      "Percentage discount cannot exceed 100%"
    );
  }

  // Used count cannot exceed usage limit
  if (
    this.usageLimit !== null &&
    this.usedCount > this.usageLimit
  ) {
    throw new Error(
      "Used count cannot exceed usage limit"
    );
  }
});

// =========================================
// INDEXES
// =========================================

couponSchema.index({
  code: 1,
});

couponSchema.index({
  isActive: 1,
  expiresAt: 1,
});

module.exports = mongoose.model(
  "Coupon",
  couponSchema
);