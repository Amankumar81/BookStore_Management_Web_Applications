// const User = require("../models/User");
// const generateToken = require("../utils/generateToken");
// const crypto = require("crypto");
// const sendEmail = require("../utils/sendEmail");
// // Register user
// const register = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     // Check if all fields are provided
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already registered",
//       });
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       email,
//       password,
//     });

//     // Generate Email Verification Token
// const verificationToken = crypto.randomBytes(32).toString("hex");

// user.emailVerificationToken = verificationToken;
// user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

// await user.save();

// // Verification Link
// const verificationURL =
// `${process.env.BASE_URL}/api/auth/verify-email/${verificationToken}`;

// // Send Email
// await sendEmail({
//   to: user.email,
//   subject: "Verify Your Email",
//   html: `
//       <h2>Welcome to BookStore</h2>
//       <p>Please verify your email.</p>

//       <a href="${verificationURL}">
//           Verify Email
//       </a>

//       <p>This link expires in 24 hours.</p>
//   `,
// });

//     // Generate JWT
//     const token = generateToken(user._id, user.role);

//    const userResponse = {
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//     phone: user.phone,
//     avatar: user.avatar,
//     isVerified: user.isVerified,
//     createdAt: user.createdAt,
// };

// res.status(201).json({
//     success: true,
//     message: "Registration successful. Please verify your email.",
//     token,
//     user: userResponse,
// });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // login the user
// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check if email and password are provided
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and Password are required",
//       });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }
//      if (!user.isVerified) {
//   return res.status(401).json({
//     success: false,
//     message: "Please verify your email first.",
//   });
// }
//     // Compare password
//     const isMatch = await user.comparePassword(password);

//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//     }

//     // Generate JWT Token
//     const token = generateToken(user._id, user.role);

//     // Remove password from response
//     const userResponse = {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       phone: user.phone,
//       avatar: user.avatar,
//       isVerified: user.isVerified,
//     };

//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: userResponse,
//     });

//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// // get profile
// const getProfile = async (req, res) => {
//     res.status(200).json({
//         success: true,
//         user: req.user,
//     });
// };
// // update profile 
// const updateProfile = async (req, res) => {
//   try {
//     const { name, phone, avatar } = req.body;

//     const user = await User.findById(req.user._id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.name = name || user.name;
//     user.phone = phone || user.phone;
//     user.avatar = avatar || user.avatar;

//     const updatedUser = await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Profile updated successfully",
//       user: {
//         _id: updatedUser._id,
//         name: updatedUser.name,
//         email: updatedUser.email,
//         phone: updatedUser.phone,
//         avatar: updatedUser.avatar,
//         role: updatedUser.role,
//         isVerified: updatedUser.isVerified,
//       },
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// // change password 
// const changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     // Validate input
//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Current password and new password are required",
//       });
//     }

//     // Find logged-in user
//     const user = await User.findById(req.user._id);

//     // Verify current password
//     const isMatch = await user.comparePassword(currentPassword);

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: "Current password is incorrect",
//       });
//     }

//     // Set new password
//     user.password = newPassword;

//     // This triggers your pre("save") hook and hashes the password
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Password changed successfully",
//     });

//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// module.exports = {
//   register,
//   login,
//   getProfile,
//   updateProfile,
//   changePassword,
// };



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




