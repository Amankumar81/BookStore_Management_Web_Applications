const express = require("express");

const protect = require("../middleware/auth.middleware");

const validate = require("../middleware/validate.middleware");

const {
  wishlistSchema,
} = require("../validations/wishlist.validation");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlist.controller");

const router = express.Router();

// Add Book to Wishlist
router.post("/", protect, validate(wishlistSchema),addToWishlist);

// Get Logged-in User Wishlist
router.get("/", protect, getWishlist);

// Remove Book from Wishlist
router.delete("/:bookId", protect, removeFromWishlist);


module.exports = router;