
const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const returnController = require("../controllers/return.controller");

// All return routes require authentication
router.use(protect);

// ============================================
// ADMIN RETURN ROUTES
// ============================================

// View all customer return requests
router.get(
  "/admin/all",
  admin,
  returnController.getAllReturns
);

// View one return request as admin
router.get(
  "/admin/:id",
  admin,
  returnController.getAdminReturnById
);

// Approve or reject a return request
router.patch(
  "/admin/:id/review",
  admin,
  returnController.reviewReturnRequest
);

// Update the return/refund processing status
router.patch(
  "/admin/:id/status",
  admin,
  returnController.updateReturnStatus
);

// ============================================
// CUSTOMER RETURN ROUTES
// ============================================

// Create a return request
router.post(
  "/",
  returnController.createReturnRequest
);

// Get the logged-in customer's return requests
router.get(
  "/my",
  returnController.getMyReturns
);

// Cancel a pending return request
router.patch(
  "/:id/cancel",
  returnController.cancelMyReturn
);

// Get one of the customer's return requests
router.get(
  "/:id",
  returnController.getMyReturnById
);

module.exports = router;
