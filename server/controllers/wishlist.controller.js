const Wishlist = require("../models/Wishlist");
const Book = require("../models/Book");

// ============================================
// Add Book to Wishlist
// POST /api/wishlist
// ============================================
const addToWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: "Book ID is required",
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: req.user._id,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        books: [],
      });
    }

    const alreadyExists = wishlist.books.some(
      (id) => id.toString() === bookId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Book already in wishlist",
      });
    }

    wishlist.books.push(bookId);

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Book added to wishlist",
      wishlist,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Get My Wishlist
// GET /api/wishlist
// ============================================
const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      user: req.user._id,
    }).populate(
      "books",
      "title author image price discountPrice averageRating"
    );

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        totalBooks: 0,
        books: [],
      });
    }

    res.status(200).json({
      success: true,
      totalBooks: wishlist.books.length,
      wishlist,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// Remove Book From Wishlist
// DELETE /api/wishlist/:bookId
// ============================================
const removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      user: req.user._id,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.books = wishlist.books.filter(
      (book) => book.toString() !== req.params.bookId
    );

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Book removed from wishlist",
      wishlist,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};