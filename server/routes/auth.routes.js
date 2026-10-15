const express = require("express");

const router = express.Router();

const validate = require("../middleware/validate.middleware");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
  registerSchema,
  loginSchema,
} = require("../validations/auth.validation");

const {
  register,
  verifyEmail,
  login,
} = require("../controllers/auth.controller");

// ==============================
// Register
// ==============================
router.post(
  "/register",
  validate(registerSchema),
  register
);

// ==============================
// Verify Email
// ==============================

router.get(
  "/verify-email/:token",
  verifyEmail
);

// ==============================
// Login
// ==============================
router.post(
  "/login",
  validate(loginSchema),
  login
);

// ==============================
// Admin Route
// ==============================
router.get(
  "/admin",
  protect,
  authorize("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

module.exports = router;