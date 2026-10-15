const express = require("express");

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/forgotPassword.controller");

const router = express.Router();

// Send Reset Link
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password/:token", resetPassword);

module.exports = router;