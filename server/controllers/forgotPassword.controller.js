const crypto = require("crypto");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// =============================================
// Forgot Password
// POST /api/auth/forgot-password
// =============================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log(resetToken)

    // Hash Token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save in DB
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min

    await user.save();

    // Reset URL
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Email HTML
    const message = `
      <h2>Password Reset Request</h2>

      <p>Hello ${user.name},</p>

      <p>You requested to reset your password.</p>

      <a href="${resetURL}">
        Click here to Reset Password
      </a>

      <p>This link expires in 15 minutes.</p>

      <p>If you didn't request this, ignore this email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "Password Reset",
      message,
    });

    res.status(200).json({
      success: true,
      message: "Reset link sent to email",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Reset Password
// POST /api/auth/reset-password/:token
// =============================================
const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
};