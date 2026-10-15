const Joi = require("joi");

const placeOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().min(3).max(100).required(),

    phone: Joi.string()
      .trim()
      .pattern(/^[0-9]{10,15}$/)
      .required(),

    address: Joi.string().trim().min(5).max(200).required(),

    city: Joi.string().trim().min(2).max(50).required(),

    state: Joi.string().trim().min(2).max(50).required(),

    postalCode: Joi.string()
      .trim()
      .pattern(/^[0-9]{5,10}$/)
      .required(),

    country: Joi.string().trim().default("India"),
  }).required(),

  paymentMethod: Joi.string()
    .valid("COD", "Razorpay", "Stripe")
    .default("COD"),

  // Optional coupon code for Checkout
  couponCode: Joi.string()
    .trim()
    .uppercase()
    .allow("")
    .optional(),
});

module.exports = {
  placeOrderSchema,
};