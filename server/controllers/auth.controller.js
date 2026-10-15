const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

// Register user
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError("Email already registered", 400);
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires =
    Date.now() + 24 * 60 * 60 * 1000;

  await user.save();

  // Verification URL
  const verificationURL =
    `${process.env.BASE_URL}/api/auth/verify-email/${verificationToken}`;

  // Send verification email
  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
      <h2>Welcome to BookStore</h2>
      <p>Please verify your email.</p>

      <a href="${verificationURL}">
        Verify Email
      </a>

      <p>This link expires in 24 hours.</p>
    `,
  });

  // Generate JWT
  const token = generateToken(user._id, user.role);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };

  res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email.",
    token,
    user: userResponse,
  });
});


// Verify Email
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token",
    });
  }

  // Verify user
  user.isVerified = true;

  // Remove verification token after successful verification
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now login.",
  });
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (!user.isVerified) {
    throw new ApiError(
      "Please verify your email first.",
      401
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(
      "Invalid email or password",
      401
    );
  }

  const token = generateToken(user._id, user.role);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isVerified: user.isVerified,
  };

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: userResponse,
  });
});


// Get profile
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});


// Update profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  user.name = name || user.name;
  user.phone = phone || user.phone;
  user.avatar = avatar || user.avatar;

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
    },
  });
});


// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw new ApiError(
      "Current password is incorrect",
      400
    );
  }

  user.password = newPassword;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});


module.exports = {
  register,
  verifyEmail,
  login,
  getProfile,
  updateProfile,
  changePassword,
};




