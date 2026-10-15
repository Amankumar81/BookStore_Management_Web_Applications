const crypto = require("crypto");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// ==========================================
// Send Verification Email
// POST /api/auth/send-verification
// ==========================================
const sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.verificationToken = verificationToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const verificationURL =
      `${process.env.BASE_URL}/api/auth/verify-email/${verificationToken}`;

    const message = `
Hello ${user.name},

Please verify your email by clicking the link below:

${verificationURL}

This link will expire in 24 hours.

BookStore Team
`;

    await sendEmail({
      email: user.email,
      subject: "Verify Your BookStore Account",
      message,
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Verify Email
// GET /api/auth/verify-email/:token
// ==========================================
const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isVerified = true;
    user.verificationToken = "";
    user.verificationTokenExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Resend Verification Email
// POST /api/auth/resend-verification
// ==========================================
const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.verificationToken = verificationToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const verificationURL =
      `${process.env.BASE_URL}/api/auth/verify-email/${verificationToken}`;

    const message = `
Hello ${user.name},

Please verify your email by clicking the link below:

${verificationURL}

This link will expire in 24 hours.

BookStore Team
`;

    await sendEmail({
      email: user.email,
      subject: "Verify Your BookStore Account",
      message,
    });

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
};