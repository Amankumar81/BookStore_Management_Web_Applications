const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // ============================================
    // BASIC USER INFORMATION
    // ============================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // ROLE
    // ============================================

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    // ============================================
    // EMAIL STATUS
    // ============================================

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // ACCOUNT STATUS
    // ============================================

    isBlocked: {
      type: Boolean,
      default: false,
    },

    blockedAt: {
      type: Date,
      default: null,
    },

    blockedReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    // ============================================
    // PASSWORD RESET
    // ============================================

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },
  },

  {
    timestamps: true,
  }
);

// ============================================
// PASSWORD HASHING
// ============================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================
// COMPARE PASSWORD
// ============================================

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);