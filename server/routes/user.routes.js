const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const authorize = require("../middleware/role.middleware");

const {
  updateProfileSchema,
  changePasswordSchema,
} = require("../validations/user.validation");

const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/auth.controller");

const {
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer,
  deleteCustomer,
} = require("../controllers/user.controller");

// =====================================
// LOGGED-IN USER PROFILE
// =====================================

// Get Logged-in User Profile
// GET /api/user/profile
router.get(
  "/profile",
  protect,
  getProfile
);

// Update Profile
// PUT /api/user/profile
router.put(
  "/profile",
  protect,
  validate(updateProfileSchema),
  updateProfile
);

// Change Password
// PUT /api/user/change-password
router.put(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword
);

// =====================================
// ADMIN CUSTOMER MANAGEMENT
// =====================================

// Get All Customers
// GET /api/user/customers
router.get(
  "/customers",
  protect,
  authorize("admin"),
  getAllCustomers
);

// Get Customer By ID
// GET /api/user/customers/:id
router.get(
  "/customers/:id",
  protect,
  authorize("admin"),
  getCustomerById
);

// Block Customer
// PUT /api/user/customers/:id/block
router.put(
  "/customers/:id/block",
  protect,
  authorize("admin"),
  blockCustomer
);

// Unblock Customer
// PUT /api/user/customers/:id/unblock
router.put(
  "/customers/:id/unblock",
  protect,
  authorize("admin"),
  unblockCustomer
);

// Delete Customer
// DELETE /api/user/customers/:id
router.delete(
  "/customers/:id",
  protect,
  authorize("admin"),
  deleteCustomer
);

module.exports = router;