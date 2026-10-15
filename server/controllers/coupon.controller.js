
const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");

// =========================================
// SHARED HELPERS
// =========================================

const isValidDate = (value) => {
  return value && !Number.isNaN(new Date(value).getTime());
};

const isCouponExpired = (coupon) => {
  return new Date(coupon.expiresAt).getTime() <= Date.now();
};

const isUsageLimitReached = (coupon) => {
  return coupon.usedCount >= coupon.usageLimit;
};

const getCouponStatus = (coupon) => {
  if (!coupon.isActive) return "Inactive";
  if (isCouponExpired(coupon)) return "Expired";
  if (isUsageLimitReached(coupon)) return "Usage Limit Reached";
  return "Active";
};

const validateDiscount = (discountType, discountValue) => {
  if (!["percentage", "fixed"].includes(discountType)) {
    return "Discount type must be percentage or fixed";
  }

  if (
    discountValue === undefined ||
    discountValue === null ||
    discountValue === "" ||
    !Number.isFinite(Number(discountValue)) ||
    Number(discountValue) <= 0
  ) {
    return "Discount value must be greater than 0";
  }

  if (
    discountType === "percentage" &&
    Number(discountValue) > 100
  ) {
    return "Percentage discount cannot exceed 100%";
  }

  return null;
};

// =========================================
// CREATE COUPON
// POST /api/coupons
// Admin only
// =========================================

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minimumAmount = 0,
      maximumDiscount = null,
      expiresAt,
      usageLimit = 100,
      isActive = true,
    } = req.body;

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length < 3 || normalizedCode.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must contain 3 to 30 characters",
      });
    }

    const discountError = validateDiscount(
      discountType,
      discountValue
    );

    if (discountError) {
      return res.status(400).json({
        success: false,
        message: discountError,
      });
    }

    if (
      !Number.isFinite(Number(minimumAmount)) ||
      Number(minimumAmount) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount cannot be negative",
      });
    }

    if (
      maximumDiscount !== null &&
      maximumDiscount !== "" &&
      maximumDiscount !== undefined &&
      (!Number.isFinite(Number(maximumDiscount)) ||
        Number(maximumDiscount) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum discount cannot be negative",
      });
    }

    if (!isValidDate(expiresAt) || new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be a valid future date",
      });
    }

    if (
      !Number.isInteger(Number(usageLimit)) ||
      Number(usageLimit) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a positive integer",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Coupon status must be active or inactive",
      });
    }

    const existingCoupon = await Coupon.findOne({
      code: normalizedCode,
    });

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: "Coupon already exists",
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      minimumAmount: Number(minimumAmount),
      maximumDiscount:
        maximumDiscount === null ||
        maximumDiscount === "" ||
        maximumDiscount === undefined
          ? null
          : Number(maximumDiscount),
      expiresAt: new Date(expiresAt),
      usageLimit: Number(usageLimit),
      usedCount: 0,
      isActive,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error("CREATE COUPON ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create coupon",
    });
  }
};

// =========================================
// GET ALL COUPONS
// GET /api/coupons
// Admin only
// =========================================

const getCoupons = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const filter = {};

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.code = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    if (status === "inactive") {
      filter.isActive = false;
    } else if (status === "expired") {
      filter.expiresAt = { $lte: new Date() };
    } else if (status === "active") {
      filter.isActive = true;
      filter.expiresAt = { $gt: new Date() };
    }

    const coupons = await Coupon.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const formattedCoupons = coupons.map((coupon) => ({
      ...coupon,
      status: getCouponStatus(coupon),
      remainingUses: Math.max(
        coupon.usageLimit - coupon.usedCount,
        0
      ),
    }));

    let result = formattedCoupons;

    if (status === "limit") {
      result = result.filter(isUsageLimitReached);
    } else if (status === "active") {
      result = result.filter(
        (coupon) => getCouponStatus(coupon) === "Active"
      );
    }

    return res.status(200).json({
      success: true,
      totalCoupons: result.length,
      coupons: result,
    });
  } catch (error) {
    console.error("GET COUPONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load coupons",
    });
  }
};

// =========================================
// UPDATE COUPON
// PUT /api/coupons/:id
// Admin only
// =========================================

const updateCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minimumAmount,
      maximumDiscount,
      expiresAt,
      usageLimit,
      isActive,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    if (code !== undefined) {
      if (typeof code !== "string" || !code.trim()) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is required",
        });
      }

      const normalizedCode = code.trim().toUpperCase();

      if (normalizedCode.length < 3 || normalizedCode.length > 30) {
        return res.status(400).json({
          success: false,
          message: "Coupon code must contain 3 to 30 characters",
        });
      }

      const duplicateCoupon = await Coupon.findOne({
        code: normalizedCode,
        _id: { $ne: coupon._id },
      });

      if (duplicateCoupon) {
        return res.status(409).json({
          success: false,
          message: "Another coupon already uses this code",
        });
      }

      coupon.code = normalizedCode;
    }

    const nextType = discountType ?? coupon.discountType;
    const nextValue = discountValue ?? coupon.discountValue;

    const discountError = validateDiscount(nextType, nextValue);

    if (discountError) {
      return res.status(400).json({
        success: false,
        message: discountError,
      });
    }

    coupon.discountType = nextType;
    coupon.discountValue = Number(nextValue);

    if (minimumAmount !== undefined) {
      if (
        minimumAmount === "" ||
        !Number.isFinite(Number(minimumAmount)) ||
        Number(minimumAmount) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount cannot be negative",
        });
      }

      coupon.minimumAmount = Number(minimumAmount);
    }

    if (maximumDiscount !== undefined) {
      if (
        maximumDiscount !== null &&
        maximumDiscount !== "" &&
        (!Number.isFinite(Number(maximumDiscount)) ||
          Number(maximumDiscount) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Maximum discount cannot be negative",
        });
      }

      coupon.maximumDiscount =
        maximumDiscount === null || maximumDiscount === ""
          ? null
          : Number(maximumDiscount);
    }

    if (expiresAt !== undefined) {
      if (
        !isValidDate(expiresAt) ||
        new Date(expiresAt) <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Expiry date must be a valid future date",
        });
      }

      coupon.expiresAt = new Date(expiresAt);
    }

    if (usageLimit !== undefined) {
      if (
        !Number.isInteger(Number(usageLimit)) ||
        Number(usageLimit) < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Usage limit must be a positive integer",
        });
      }

      if (Number(usageLimit) < coupon.usedCount) {
        return res.status(400).json({
          success: false,
          message: "Usage limit cannot be lower than used count",
        });
      }

      coupon.usageLimit = Number(usageLimit);
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Coupon status must be active or inactive",
        });
      }

      coupon.isActive = isActive;
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("UPDATE COUPON ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
};

// =========================================
// DELETE COUPON
// DELETE /api/coupons/:id
// Admin only
// =========================================

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("DELETE COUPON ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
    });
  }
};

// =========================================
// APPLY COUPON
// POST /api/coupons/apply
// Logged-in customer
// =========================================

const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // Check whether the admin enabled the coupon.
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon is inactive",
      });
    }

    // Recheck expiry using the current server time.
    if (isCouponExpired(coupon)) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired",
      });
    }

    // Do not allow exhausted coupons.
    if (isUsageLimitReached(coupon)) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    const cartTotal = Number(cart.totalPrice);

    if (!Number.isFinite(cartTotal) || cartTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart total is invalid",
      });
    }

    if (cartTotal < coupon.minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${coupon.minimumAmount}`,
      });
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.discountValue) / 100;

      if (
        coupon.maximumDiscount !== null &&
        coupon.maximumDiscount !== undefined
      ) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    // Discount must never exceed the cart total.
    discount = Math.min(discount, cartTotal);
    discount = Math.round((discount + Number.EPSILON) * 100) / 100;

    const finalPrice = Math.max(
      0,
      Math.round((cartTotal - discount + Number.EPSILON) * 100) / 100
    );

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupon: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      totalPrice: cartTotal,
      finalPrice,
      savings: discount,
      expiresAt: coupon.expiresAt,
      remainingUses: Math.max(
        coupon.usageLimit - coupon.usedCount,
        0
      ),
    });
  } catch (error) {
    console.error("APPLY COUPON ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
    });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};
