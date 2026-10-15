const Cart = require("../models/Cart");
const Book = require("../models/Book");

const POPULATE_FIELDS =
  "title author category description image price discountPrice stock averageRating totalReviews isbn publisher language pages";

// ==========================================
// Helper Functions
// ==========================================
const calculateCart = (cart) => {
  let totalItems = 0;
  let totalPrice = 0;

  cart.items.forEach((item) => {
    totalItems += Number(item.quantity || 0);
    totalPrice += Number(item.quantity || 0) * Number(item.price || 0);
  });

  cart.totalItems = totalItems;
  cart.totalPrice = totalPrice;
};

// Merges duplicate rows of the same book into a single row.
// Returns true if the cart was changed.
const mergeDuplicateItems = (cart) => {
  const map = new Map();

  cart.items.forEach((item) => {
    const id = String(item.book);
    const qty = Number(item.quantity || 0);

    if (map.has(id)) {
      map.get(id).quantity += qty;
    } else {
      map.set(id, { book: item.book, quantity: qty, price: item.price });
    }
  });

  if (map.size === cart.items.length) return false;

  cart.items = Array.from(map.values());
  return true;
};

// ==========================================
// Add Book To Cart
// POST /api/cart
// ==========================================
const addToCart = async (req, res) => {
  try {
    const { bookId, quantity } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: "Book ID is required",
      });
    }

    const qty = Number(quantity) || 1;

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Book is out of stock",
      });
    }

    if (qty > book.stock) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    // Find the user's cart or create it in ONE atomic step.
    // This prevents two simultaneous requests from creating two carts.
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { items: [] } },
      { new: true, upsert: true }
    );

    // Heal any duplicate rows that already exist
    mergeDuplicateItems(cart);

    const itemIndex = cart.items.findIndex(
      (item) => String(item.book) === String(book._id)
    );

    if (itemIndex > -1) {
      const newQuantity = Number(cart.items[itemIndex].quantity || 0) + qty;

      if (newQuantity > book.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${book.stock} items available`,
        });
      }

      cart.items[itemIndex].quantity = newQuantity;
      cart.items[itemIndex].price = book.discountPrice || book.price;
    } else {
      cart.items.push({
        book: book._id,
        quantity: qty,
        price: book.discountPrice || book.price,
      });
    }

    calculateCart(cart);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Book added to cart",
      cart,
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Get User Cart
// GET /api/cart
// ==========================================
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        totalItems: 0,
        totalPrice: 0,
        items: [],
      });
    }

    // Clean up duplicate rows saved earlier
    if (mergeDuplicateItems(cart)) {
      calculateCart(cart);
      await cart.save();
    }

    cart = await Cart.findById(cart._id).populate("items.book", POPULATE_FIELDS);

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Update Quantity
// PUT /api/cart/:bookId
// ==========================================
const updateCart = async (req, res) => {
  try {
    const { quantity } = req.body;

    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Make sure there is only one row per book before updating
    mergeDuplicateItems(cart);

    const item = cart.items.find(
      (i) => String(i.book) === String(req.params.bookId)
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Book not found in cart",
      });
    }

    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Book is out of stock",
      });
    }

    if (newQuantity > book.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${book.stock} items available`,
      });
    }

    item.quantity = newQuantity;
    item.price = book.discountPrice || book.price;

    calculateCart(cart);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Remove One Item
// DELETE /api/cart/:bookId
// ==========================================
const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.some(
      (item) => String(item.book) === String(req.params.bookId)
    );

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: "Book not found in cart",
      });
    }

    // Removes every row of this book, including any duplicates
    cart.items = cart.items.filter(
      (item) => String(item.book) !== String(req.params.bookId)
    );

    calculateCart(cart);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Book removed from cart",
      cart,
    });
  } catch (error) {
    console.error("REMOVE CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Clear Cart
// DELETE /api/cart
// ==========================================
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCart,
  removeFromCart,
  clearCart,
};