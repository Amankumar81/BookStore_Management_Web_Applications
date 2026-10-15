const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required(),

  email: Joi.string()
    .email()
    .required(),

  phone: Joi.string()
    .trim()
    .required(),

  password: Joi.string()
    .min(6)
    .max(30)
    .required(),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};