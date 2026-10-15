const Joi = require("joi");

const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50),

  phone: Joi.string()
    .trim()
    .allow(""),

  avatar: Joi.string()
    .uri()
    .allow(""),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required(),

  newPassword: Joi.string()
    .min(6)
    .max(30)
    .required(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
};