const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");

const {
  placeOrderSchema,
} = require("../validations/order.validation");

const {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  updateDeliveryInformation,
  verifyDelivery,
  generateOrderQR,
} = require("../controllers/order.controller");

// ============================================
// Customer
// ============================================

// Place Order
// POST /api/orders
router.post(
  "/",
  protect,
  validate(placeOrderSchema),
  placeOrder
);

// Get My Orders
// GET /api/orders/my-orders
router.get(
  "/my-orders",
  protect,
  getMyOrders
);

// Generate Order QR
// GET /api/orders/:id/qr
router.get(
  "/:id/qr",
  protect,
  generateOrderQR
);

// Get Single Order
// GET /api/orders/:id
router.get(
  "/:id",
  protect,
  getOrderById
);

// Cancel Order
// PUT /api/orders/:id/cancel
router.put(
  "/:id/cancel",
  protect,
  cancelOrder
);

// ============================================
// Admin
// ============================================

// Get All Orders
// GET /api/orders
router.get(
  "/",
  protect,
  authorize("admin"),
  getAllOrders
);

// Update Order Status
// PUT /api/orders/:id/status
router.put(
  "/:id/status",
  protect,
  authorize("admin"),
  updateOrderStatus
);

// Update Tracking Information
// PUT /api/orders/:id/tracking
router.put(
  "/:id/tracking",
  protect,
  authorize("admin"),
  updateOrderTracking
);

// Update Delivery Information
// PUT /api/orders/:id/delivery
router.put(
  "/:id/delivery",
  protect,
  authorize("admin"),
  updateDeliveryInformation
);

// Verify Delivery
// PUT /api/orders/:id/delivery/verify
router.put(
  "/:id/delivery/verify",
  protect,
  authorize("admin"),
  verifyDelivery
);

module.exports = router;