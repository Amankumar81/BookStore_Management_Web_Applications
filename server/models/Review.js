const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      maxlength: 1000,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One review per user per book
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);