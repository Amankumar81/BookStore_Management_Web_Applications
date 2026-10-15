const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    items: [
      {
        book: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Book",
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
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
    ],

    reason: {
      type: String,
      required: [true, "Return reason is required"],
      enum: [
        "Damaged item",
        "Wrong item received",
        "Item not as described",
        "Missing items",
        "Other",
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "Rejected",
        "Pickup Scheduled",
        "Item Received",
        "Refund Processing",
        "Refunded",
        "Completed",
        "Cancelled",
      ],
      default: "Requested",
      index: true,
    },

    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin note cannot exceed 1000 characters"],
      default: "",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

returnSchema.index({ order: 1, user: 1 });

module.exports = mongoose.model("Return", returnSchema);