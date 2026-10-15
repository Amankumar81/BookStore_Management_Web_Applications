const mongoose = require("mongoose");
const Review = require("../models/Review");
const Book = require("../models/Book");

// ===============================
// Update Book Rating & Reviews
// ===============================
const updateBookRating = async (bookId) => {
  const stats = await Review.aggregate([
    {
     $match: {
     book: new mongoose.Types.ObjectId(bookId),
    },
    },
    {
      $group: {
        _id: "$book",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  console.log(stats);
  
  if (stats.length > 0) {
      await Book.findByIdAndUpdate(bookId, {
          averageRating: stats[0].averageRating,
          totalReviews: stats[0].totalReviews,
        });
    } else {
        await Book.findByIdAndUpdate(bookId, {
            averageRating: 0,
            totalReviews: 0,
        });
    }
};


// ===============================
// Add Review
// ===============================
const addReview = async (req, res) => {
  try {
    const { rating, comment, bookId } = req.body;

    // Check required fields
    if (!rating || !comment || !bookId) {
      return res.status(400).json({
        success: false,
        message: "Rating, comment and bookId are required",
      });
    }

    // Check book exists
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check duplicate review
    const alreadyReviewed = await Review.findOne({
      user: req.user._id,
      book: bookId,
    });

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this book",
      });
    }

    // Create review
    const review = await Review.create({
      rating,
      comment,
      user: req.user._id,
      book: bookId,
    });

    // Update average rating & total reviews
    await updateBookRating(bookId);

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;

    const reviews = await Review.find({ book: bookId })
      .populate("user", "name");

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    res.status(200).json({
      success: true,
      totalReviews: reviews.length,
      averageRating,
      reviews,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own review",
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();

    // Recalculate book rating
    await updateBookRating(review.book);

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own review",
      });
    }

    // Store bookId before deleting
    const bookId = review.book;

    // Delete review
    await Review.findByIdAndDelete(id);

    // Update book rating
    await updateBookRating(bookId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  addReview,
  getBookReviews,
  updateReview,
  deleteReview,
};