const express = require("express");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");

const {
  couponSchema,
} = require("../validations/coupon.validation");

const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require("../controllers/coupon.controller");

const router = express.Router();

// =========================================
// CUSTOMER
// =========================================

// Apply Coupon
// POST /api/coupons/apply
router.post(
  "/apply",
  protect,
  applyCoupon
);

// =========================================
// ADMIN
// =========================================

// Create Coupon
// POST /api/coupons
router.post(
  "/",
  protect,
  authorize("admin"),
  validate(couponSchema),
  createCoupon
);

// Get All Coupons
// GET /api/coupons
router.get(
  "/",
  protect,
  authorize("admin"),
  getCoupons
);

// Update Coupon
// PUT /api/coupons/:id
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateCoupon
);

// Delete Coupon
// DELETE /api/coupons/:id
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteCoupon
);

module.exports = router;