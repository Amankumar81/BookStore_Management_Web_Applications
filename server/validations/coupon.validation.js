const Joi = require("joi");

const couponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.empty": "Coupon code is required",
      "string.min": "Coupon code must be at least 3 characters",
      "string.max": "Coupon code cannot exceed 30 characters",
      "any.required": "Coupon code is required",
    }),

  discountType: Joi.string()
    .valid("percentage", "fixed")
    .required()
    .messages({
      "any.only": "Discount type must be percentage or fixed",
      "any.required": "Discount type is required",
    }),

  discountValue: Joi.number()
    .min(1)
    .required()
    .messages({
      "number.min": "Discount value must be at least 1",
      "any.required": "Discount value is required",
    }),

  minimumAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      "number.min": "Minimum amount cannot be negative",
    }),

  maximumDiscount: Joi.number()
    .min(0)
    .allow(null)
    .default(null)
    .messages({
      "number.min": "Maximum discount cannot be negative",
    }),

  expiresAt: Joi.date()
    .greater("now")
    .required()
    .messages({
      "date.greater": "Expiry date must be in the future",
      "any.required": "Expiry date is required",
    }),

  usageLimit: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .messages({
      "number.integer": "Usage limit must be a whole number",
      "number.min": "Usage limit must be at least 1",
    }),

  isActive: Joi.boolean()
    .default(true),
});

module.exports = {
  couponSchema,
};