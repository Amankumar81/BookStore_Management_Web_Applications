const express = require("express");

const protect = require("../middleware/auth.middleware");
const {
  addToCart,
  getCart,
  updateCart,
  removeFromCart,
  clearCart,
} = require("../controllers/cart.controller");

const router = express.Router();

const cartController = require("../controllers/cart.controller");

const validate = require("../middleware/validate.middleware");

const {
  cartSchema,
} = require("../validations/cart.validation");

// Add Book to Cart
router.post("/", protect, validate(cartSchema),addToCart);

// Get Logged-in User Cart
router.get("/", protect, getCart);

// Update Quantity
router.put("/:bookId", protect, updateCart);

// Remove One Item
router.delete("/:bookId", protect, removeFromCart);

// Clear Cart
router.delete("/", protect, clearCart);

module.exports = router;