const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      maxlength: 200,
    },

    author: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Programming",
        "Novel",
        "Science",
        "History",
        "Biography",
        "Business",
        "Technology",
        "Self Help",
        "Fiction",
        "Other",
      ],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
     sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    isbn: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    publisher: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: "English",
    },

    pages: {
      type: Number,
      default: 0,
    },

    image: {
  url: {
    type: String,
    default: "",
  },
  public_id: {
    type: String,
    default: "",
  },
},

    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    bestSeller: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Book", bookSchema);