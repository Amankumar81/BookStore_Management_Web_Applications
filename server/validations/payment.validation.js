const Joi = require("joi");

const shippingAddressSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
  country: Joi.string().trim().default("India"),
});

const createPaymentOrderSchema = Joi.object({
  shippingAddress: shippingAddressSchema.required(),
  idempotencyKey: Joi.string().trim().min(8).max(200).required(),
  couponCode: Joi.string().trim().allow("").optional(),
  paymentExperience: Joi.string()
    .valid("upi", "qr", "cards")
    .default("cards"),
});

const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().required(),
  razorpay_signature: Joi.string().trim().required(),
});

const createPaymentQrSchema = Joi.object({
  paymentId: Joi.string().hex().length(24).required(),
});

const paymentSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
});

module.exports = {
  paymentSchema,
  createPaymentOrderSchema,
  verifyPaymentSchema,
  createPaymentQrSchema,
};
