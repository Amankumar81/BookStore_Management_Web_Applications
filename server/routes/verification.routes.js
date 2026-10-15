const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/verification.controller");

// =====================================
// Send Verification Email
// =====================================
router.post(
  "/send-verification",
  protect,
  sendVerificationEmail
);

// =====================================
// Verify Email
// GET /api/auth/verify-email/:token
// =====================================
router.get(
  "/verify-email/:token",
  verifyEmail
);

// =====================================
// Resend Verification Email
// POST /api/auth/resend-verification
// =====================================
router.post(
  "/resend-verification",
  protect,
  resendVerificationEmail
);

module.exports = router;